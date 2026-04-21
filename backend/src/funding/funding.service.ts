import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AccountType,
  FundingNetwork,
  FundingStatus,
  FundingType,
  Prisma
} from '@prisma/client';

import type { UserEntity } from '../auth/entities/user.entity';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';

import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import {
  FundingRecordResponseDto,
  PaginatedFundingRecordsResponseDto
} from './dto/funding-record-response.dto';
import { QueryAdminFundingRecordsDto } from './dto/query-admin-funding-records.dto';
import { QueryFundingRecordsDto } from './dto/query-funding-records.dto';
import { ReviewFundingRecordDto } from './dto/review-funding-record.dto';

const USER_FUNDING_TYPE_MAP = {
  deposit: FundingType.DEPOSIT,
  withdraw: FundingType.WITHDRAW
} as const;

const USER_FUNDING_STATUS_MAP = {
  pending: FundingStatus.PENDING,
  completed: FundingStatus.COMPLETED,
  failed: FundingStatus.FAILED
} as const;

type FundingRecordWithUser = Prisma.FundingRecordGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        displayName: true;
        realBalance: true;
      };
    };
  };
}>;

@Injectable()
export class FundingService {
  private readonly logger = new Logger(FundingService.name);
  private readonly minWithdrawAmount = 10;
  private readonly trx20AddressPattern = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

  constructor(private readonly prisma: PrismaService) {}

  async createDeposit(userId: string, dto: CreateDepositDto): Promise<FundingRecordResponseDto> {
    this.ensureValidAmount(dto.amount);
    this.ensureSupportedNetwork(dto.network);

    const txHash = this.normalizeTxHash(dto.txHash);
    const remark = this.normalizeOptionalText(dto.remark);

    const existingRecord = await this.prisma.fundingRecord.findFirst({
      where: {
        network: FundingNetwork.TRC20,
        txHash
      }
    });

    if (existingRecord) {
      throw new BusinessException(HttpStatus.CONFLICT, 'DUPLICATE_TX_HASH', '充值交易哈希已存在');
    }

    try {
      const record = await this.prisma.fundingRecord.create({
        data: {
          userId,
          type: FundingType.DEPOSIT,
          status: FundingStatus.PENDING,
          amount: new Prisma.Decimal(dto.amount),
          network: FundingNetwork.TRC20,
          txHash,
          remark
        }
      });

      this.logger.log(`Funding deposit request created: userId=${userId}, recordId=${record.id}`);

      return new FundingRecordResponseDto(record);
    } catch (error) {
      this.handleFundingCreateError(error);
    }
  }

  async createWithdraw(
    user: Pick<UserEntity, 'id' | 'verificationStatus' | 'realBalance'>,
    dto: CreateWithdrawDto
  ): Promise<FundingRecordResponseDto> {
    this.ensureValidWithdrawAmount(dto.amount);
    this.ensureSupportedNetwork(dto.network);
    this.ensureTrc20Address(dto.toAddress);

    if (user.verificationStatus !== 'VERIFIED') {
      throw new BusinessException(HttpStatus.FORBIDDEN, 'KYC_REQUIRED', '提领前需完成 KYC');
    }

    if (user.realBalance < dto.amount) {
      throw new BusinessException(HttpStatus.CONFLICT, 'INSUFFICIENT_BALANCE', '可提余额不足');
    }

    const record = await this.prisma.fundingRecord.create({
      data: {
        userId: user.id,
        type: FundingType.WITHDRAW,
        status: FundingStatus.PENDING,
        amount: new Prisma.Decimal(dto.amount),
        network: FundingNetwork.TRC20,
        toAddress: dto.toAddress.trim(),
        remark: this.normalizeOptionalText(dto.remark)
      }
    });

    this.logger.log(`Funding withdraw request created: userId=${user.id}, recordId=${record.id}`);

    return new FundingRecordResponseDto(record);
  }

  async findUserRecords(
    userId: string,
    query: QueryFundingRecordsDto
  ): Promise<PaginatedFundingRecordsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FundingRecordWhereInput = {
      userId,
      type: this.parseFundingType(query.type),
      status: this.parseFundingStatus(query.status)
    };

    const [records, total] = await Promise.all([
      this.prisma.fundingRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.fundingRecord.count({ where })
    ]);

    return new PaginatedFundingRecordsResponseDto(records, total, page, limit);
  }

  async findAdminRecords(
    query: QueryAdminFundingRecordsDto
  ): Promise<PaginatedFundingRecordsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (query.from) {
      createdAtFilter.gte = new Date(query.from);
    }
    if (query.to) {
      createdAtFilter.lte = new Date(query.to);
    }

    const where: Prisma.FundingRecordWhereInput = {
      type: this.parseFundingType(query.type),
      status: this.parseFundingStatus(query.status),
      userId: query.userId,
      ...(query.username
        ? {
            user: {
              OR: [
                {
                  displayName: {
                    contains: query.username,
                    mode: 'insensitive'
                  }
                },
                {
                  email: {
                    contains: query.username,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          }
        : {}),
      ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {})
    };

    const [records, total] = await Promise.all([
      this.prisma.fundingRecord.findMany({
        where,
        include: {
          user: {
            select: {
              displayName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.fundingRecord.count({ where })
    ]);

    return new PaginatedFundingRecordsResponseDto(records, total, page, limit, true);
  }

  /** CMS 角标等：仅统计待审核条数 */
  async countAdminPendingRecords(filters: { type?: string } = {}): Promise<{ total: number }> {
    const where: Prisma.FundingRecordWhereInput = {
      status: FundingStatus.PENDING,
      ...(filters.type ? { type: this.parseFundingType(filters.type) } : {})
    };
    const total = await this.prisma.fundingRecord.count({ where });
    return { total };
  }

  async reviewRecord(
    id: string,
    dto: ReviewFundingRecordDto,
    reviewerId: string
  ): Promise<{ record: FundingRecordResponseDto }> {
    const action = this.parseReviewAction(dto.action);
    const shouldApplyBalance = action === 'approve' ? dto.applyBalance !== false : false;

    if (action === 'reject' && dto.applyBalance) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'BALANCE_NOT_APPLICABLE',
        '驳回记录时不能套用余额变更'
      );
    }

    const record = await this.prisma.$transaction(
      async tx => this.reviewRecordInTransaction(tx, id, dto, reviewerId, action, shouldApplyBalance),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );

    this.logger.log(
      `Funding record reviewed: recordId=${id}, reviewerId=${reviewerId}, status=${record.record.status}`
    );

    return record;
  }

  private async reviewRecordInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    dto: ReviewFundingRecordDto,
    reviewerId: string,
    action: 'approve' | 'reject',
    shouldApplyBalance: boolean
  ): Promise<{ record: FundingRecordResponseDto }> {
    const record = await tx.fundingRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            realBalance: true
          }
        }
      }
    });

    if (!record) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'FUNDING_RECORD_NOT_FOUND',
        '出入金记录不存在'
      );
    }

    if (record.status.toString().toUpperCase() !== FundingStatus.PENDING) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'FUNDING_ALREADY_REVIEWED',
        '该出入金记录已完成审核'
      );
    }

    const amount = new Prisma.Decimal(record.amount.toString());
    const beforeBalance = new Prisma.Decimal(record.user.realBalance.toString());
    const normalizedType = record.type.toString().toUpperCase();

    if (
      shouldApplyBalance &&
      normalizedType === FundingType.WITHDRAW &&
      beforeBalance.lessThan(amount)
    ) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'INSUFFICIENT_REAL_BALANCE',
        '核准提领时真实余额不足'
      );
    }

    const delta =
      normalizedType === FundingType.DEPOSIT ? amount : new Prisma.Decimal(0).sub(amount);
    const afterBalance = shouldApplyBalance ? beforeBalance.add(delta) : null;
    const nextStatus =
      action === 'approve' ? FundingStatus.COMPLETED : FundingStatus.FAILED;
    const reviewedAt = new Date();

    const updateResult = await tx.fundingRecord.updateMany({
      where: {
        id,
        status: FundingStatus.PENDING
      },
      data: {
        status: nextStatus,
        reviewNote: this.normalizeOptionalText(dto.reviewNote),
        reviewedAt,
        reviewedBy: reviewerId,
        balanceApplied: shouldApplyBalance,
        beforeRealBalance: shouldApplyBalance ? beforeBalance : null,
        afterRealBalance: shouldApplyBalance ? afterBalance : null
      }
    });

    if (updateResult.count === 0) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'FUNDING_ALREADY_REVIEWED',
        '该出入金记录已完成审核'
      );
    }

    if (shouldApplyBalance && afterBalance) {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          realBalance: afterBalance
        }
      });

      await tx.balanceLedger.create({
        data: {
          userId: record.userId,
          accountType: AccountType.REAL,
          delta,
          beforeBalance,
          afterBalance,
          referenceId: id,
          referenceType: 'funding_review',
          operatorId: reviewerId
        }
      });
    }

    const reviewedRecord = await tx.fundingRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            realBalance: true
          }
        }
      }
    });

    return {
      record: new FundingRecordResponseDto(reviewedRecord as FundingRecordWithUser, true)
    };
  }

  private ensureValidAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'INVALID_AMOUNT', '金额格式错误');
    }
  }

  private ensureValidWithdrawAmount(amount: number): void {
    this.ensureValidAmount(amount);

    if (amount < this.minWithdrawAmount) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'INVALID_AMOUNT',
        `提领金额不得低于 ${this.minWithdrawAmount}`
      );
    }
  }

  private ensureSupportedNetwork(network: string): void {
    if (network !== FundingNetwork.TRC20) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', '仅支持 TRC20 网络');
    }
  }

  private ensureTrc20Address(address: string): void {
    if (!this.trx20AddressPattern.test(address.trim())) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'INVALID_ADDRESS', '充值地址格式错误');
    }
  }

  private normalizeTxHash(txHash: string | undefined): string {
    if (!txHash || !txHash.trim()) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'TX_HASH_REQUIRED',
        '充值交易哈希不能为空'
      );
    }

    const normalized = txHash.trim();
    if (normalized.length < 8) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'INVALID_TX_HASH',
        '充值交易哈希格式错误'
      );
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private parseFundingType(type?: string): FundingType | undefined {
    if (!type) {
      return undefined;
    }

    const mapped = USER_FUNDING_TYPE_MAP[type as keyof typeof USER_FUNDING_TYPE_MAP];
    if (!mapped) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', '非法的出入金类型');
    }

    return mapped;
  }

  private parseFundingStatus(status?: string): FundingStatus | undefined {
    if (!status) {
      return undefined;
    }

    const mapped = USER_FUNDING_STATUS_MAP[status as keyof typeof USER_FUNDING_STATUS_MAP];
    if (!mapped) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', '非法的出入金状态');
    }

    return mapped;
  }

  private parseReviewAction(action: string): 'approve' | 'reject' {
    if (action === 'approve' || action === 'reject') {
      return action;
    }

    throw new BusinessException(
      HttpStatus.BAD_REQUEST,
      'INVALID_REVIEW_ACTION',
      '非法的审核动作'
    );
  }

  private handleFundingCreateError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BusinessException(HttpStatus.CONFLICT, 'DUPLICATE_TX_HASH', '充值交易哈希已存在');
    }

    throw error;
  }
}
