import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DepositAddress,
  DepositAddressRisk,
  FundingNetwork,
  FundingType,
  Prisma,
} from '@prisma/client';

import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';

import {
  CreateDepositAddressDto,
  UpdateDepositAddressDto,
} from './dto/admin-deposit-address.dto';
import { DepositAddressResponseDto } from './dto/deposit-address-response.dto';

const ALLOCATION_TTL_MS = 30 * 60 * 1000; // 30 分钟
const ADDRESS_PATTERNS: Record<FundingNetwork, RegExp> = {
  [FundingNetwork.TRC20]: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  [FundingNetwork.ERC20]: /^0x[a-fA-F0-9]{40}$/,
  [FundingNetwork.BTC]: /^(bc1[a-z0-9]{39,59}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
};

@Injectable()
export class DepositAddressService {
  private readonly logger = new Logger(DepositAddressService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Admin CRUD ====================

  async listAll(): Promise<DepositAddressResponseDto[]> {
    const records = await this.prisma.depositAddress.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((r) => new DepositAddressResponseDto(r));
  }

  async create(dto: CreateDepositAddressDto): Promise<DepositAddressResponseDto> {
    const network = dto.network ?? FundingNetwork.TRC20;
    this.validateRange(dto.minAmount, dto.maxAmount ?? null);
    this.validateAddressForNetwork(dto.address, network);

    try {
      const created = await this.prisma.depositAddress.create({
        data: {
          network,
          address: dto.address.trim(),
          qrCodeUrl: dto.qrCodeUrl,
          minAmount: new Prisma.Decimal(dto.minAmount),
          maxAmount:
            dto.maxAmount === null || dto.maxAmount === undefined
              ? null
              : new Prisma.Decimal(dto.maxAmount),
          capacity:
            dto.capacity === null || dto.capacity === undefined
              ? null
              : new Prisma.Decimal(dto.capacity),
          enabled: dto.enabled ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      return new DepositAddressResponseDto(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BusinessException(
          HttpStatus.CONFLICT,
          'DEPOSIT_ADDRESS_EXISTS',
          '该入金地址已存在'
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateDepositAddressDto
  ): Promise<DepositAddressResponseDto> {
    const existing = await this.prisma.depositAddress.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DEPOSIT_ADDRESS_NOT_FOUND',
        '入金地址不存在'
      );
    }

    const nextMin =
      dto.minAmount !== undefined
        ? new Prisma.Decimal(dto.minAmount)
        : existing.minAmount;
    const nextMax =
      dto.maxAmount === undefined
        ? existing.maxAmount
        : dto.maxAmount === null
          ? null
          : new Prisma.Decimal(dto.maxAmount);
    this.validateRange(nextMin, nextMax);

    const updated = await this.prisma.depositAddress.update({
      where: { id },
      data: {
        qrCodeUrl: dto.qrCodeUrl ?? undefined,
        minAmount: dto.minAmount !== undefined ? nextMin : undefined,
        maxAmount: dto.maxAmount === undefined ? undefined : nextMax,
        capacity:
          dto.capacity === undefined
            ? undefined
            : dto.capacity === null
              ? null
              : new Prisma.Decimal(dto.capacity),
        enabled: dto.enabled,
        sortOrder: dto.sortOrder,
      },
    });
    return new DepositAddressResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.depositAddress.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DEPOSIT_ADDRESS_NOT_FOUND',
        '入金地址不存在'
      );
    }
    if (
      !new Prisma.Decimal(existing.pendingAmount).isZero()
    ) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'DEPOSIT_ADDRESS_HAS_PENDING',
        '该地址尚有审核中的金额，不能删除'
      );
    }
    await this.prisma.depositAddress.delete({ where: { id } });
  }

  // ==================== 客户端分配 ====================

  /**
   * 给用户按金额分配一个可用入金地址，并写入占位锁（30 分钟）。
   */
  async allocateForUser(
    userId: string,
    amount: number,
    network: FundingNetwork = FundingNetwork.TRC20
  ): Promise<{ network: FundingNetwork; address: string; qrCodeUrl: string; expiresAt: Date }> {
    const amountDecimal = new Prisma.Decimal(amount);

    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.depositAddress.findMany({
        where: {
          network,
          enabled: true,
          riskStatus: { not: DepositAddressRisk.RISKY },
          minAmount: { lte: amountDecimal },
          OR: [{ maxAmount: null }, { maxAmount: { gte: amountDecimal } }],
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      const fitsCapacity = candidates.filter((addr) => {
        if (!addr.capacity) return true;
        const remaining = new Prisma.Decimal(addr.capacity)
          .sub(addr.usedAmount)
          .sub(addr.pendingAmount);
        return remaining.gte(amountDecimal);
      });

      if (fitsCapacity.length === 0) {
        throw new BusinessException(
          HttpStatus.CONFLICT,
          'NO_AVAILABLE_DEPOSIT_ADDRESS',
          '当前金额暂无可用入金地址，请稍后再试或联系客服'
        );
      }

      // 用户最近 50 条入金记录（含 PENDING / COMPLETED）的 toAddress 算"已用过"
      const recentRecords = await tx.fundingRecord.findMany({
        where: {
          userId,
          type: FundingType.DEPOSIT,
          toAddress: { in: fitsCapacity.map((c) => c.address) },
        },
        select: { toAddress: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      // 用户尚未消费且未过期的占位锁 addressId 也算"已用过"
      // （这样连续拿地址但没提交时，下一次也会换一个）
      const activeAllocations = await tx.depositAllocation.findMany({
        where: {
          userId,
          consumed: false,
          expiresAt: { gte: new Date() },
          addressId: { in: fitsCapacity.map((c) => c.id) },
        },
        select: { addressId: true },
      });
      const usedByThisUser = new Set<string>([
        ...(recentRecords.map((r) => r.toAddress).filter(Boolean) as string[]),
        ...fitsCapacity
          .filter((c) => activeAllocations.some((a) => a.addressId === c.id))
          .map((c) => c.address),
      ]);

      const sorted = [...fitsCapacity].sort((a, b) => {
        const aUsed = usedByThisUser.has(a.address) ? 1 : 0;
        const bUsed = usedByThisUser.has(b.address) ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const picked = sorted[0]!;
      const expiresAt = new Date(Date.now() + ALLOCATION_TTL_MS);

      await tx.depositAddress.update({
        where: { id: picked.id },
        data: {
          pendingAmount: { increment: amountDecimal },
        },
      });

      await tx.depositAllocation.create({
        data: {
          addressId: picked.id,
          userId,
          amount: amountDecimal,
          expiresAt,
        },
      });

      return {
        network: picked.network,
        address: picked.address,
        qrCodeUrl: picked.qrCodeUrl,
        expiresAt,
      };
    });
  }

  // ==================== 风控/占位过期清理 ====================

  /**
   * 占位锁过期回收：把过期且未消费的 allocation 标记为 consumed=true（避免重复减），
   * 同时把对应 pendingAmount 减回去。
   */
  async releaseExpiredAllocations(): Promise<number> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.depositAllocation.findMany({
        where: { consumed: false, expiresAt: { lt: now } },
        select: { id: true, addressId: true, amount: true },
      });
      if (expired.length === 0) return 0;

      // 按 address 聚合
      const decrementMap = new Map<string, Prisma.Decimal>();
      for (const e of expired) {
        const cur = decrementMap.get(e.addressId) ?? new Prisma.Decimal(0);
        decrementMap.set(e.addressId, cur.add(e.amount));
      }

      await tx.depositAllocation.updateMany({
        where: { id: { in: expired.map((e) => e.id) } },
        data: { consumed: true },
      });

      for (const [addressId, decrement] of decrementMap) {
        await tx.depositAddress.update({
          where: { id: addressId },
          data: { pendingAmount: { decrement } },
        });
      }

      this.logger.log(
        `Released ${expired.length} expired deposit allocations across ${decrementMap.size} addresses`
      );
      return expired.length;
    });
  }

  /**
   * 标记某地址的最近一条未消费占位为已消费（用户提交 txHash 时调用）。
   * 找不到匹配的占位锁也不报错，让 createDeposit 自己决定容差策略。
   */
  async consumeAllocation(
    tx: Prisma.TransactionClient,
    userId: string,
    address: string,
    amount: number
  ): Promise<boolean> {
    const addressRow = await tx.depositAddress.findUnique({ where: { address } });
    if (!addressRow) return false;

    const allocation = await tx.depositAllocation.findFirst({
      where: {
        userId,
        addressId: addressRow.id,
        consumed: false,
        expiresAt: { gte: new Date() },
        amount: new Prisma.Decimal(amount),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!allocation) return false;

    await tx.depositAllocation.update({
      where: { id: allocation.id },
      data: { consumed: true },
    });
    return true;
  }

  /**
   * 入金审核结果回写额度：
   * - approve：pending -= amount，used += amount
   * - reject：pending -= amount
   * 当地址是审核之前手填、不在地址池里时，address 找不到时静默跳过。
   */
  async applyReviewOutcome(
    tx: Prisma.TransactionClient,
    address: string | null | undefined,
    amount: Prisma.Decimal,
    outcome: 'approve' | 'reject'
  ): Promise<void> {
    if (!address) return;
    const addressRow = await tx.depositAddress.findUnique({ where: { address } });
    if (!addressRow) return;

    if (outcome === 'approve') {
      await tx.depositAddress.update({
        where: { id: addressRow.id },
        data: {
          pendingAmount: { decrement: amount },
          usedAmount: { increment: amount },
        },
      });
    } else {
      await tx.depositAddress.update({
        where: { id: addressRow.id },
        data: { pendingAmount: { decrement: amount } },
      });
    }
  }

  // ==================== 工具方法 ====================

  async findByAddress(address: string): Promise<DepositAddress | null> {
    return this.prisma.depositAddress.findUnique({ where: { address } });
  }

  async getById(id: string): Promise<DepositAddressResponseDto> {
    const record = await this.prisma.depositAddress.findUnique({ where: { id } });
    if (!record) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        'DEPOSIT_ADDRESS_NOT_FOUND',
        '入金地址不存在'
      );
    }
    return new DepositAddressResponseDto(record);
  }

  private validateRange(
    min: number | Prisma.Decimal,
    max: number | Prisma.Decimal | null
  ): void {
    if (max === null || max === undefined) return;
    const minD = min instanceof Prisma.Decimal ? min : new Prisma.Decimal(min);
    const maxD = max instanceof Prisma.Decimal ? max : new Prisma.Decimal(max);
    if (maxD.lt(minD)) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'INVALID_DEPOSIT_RANGE',
        '入金区间上限必须大于等于下限'
      );
    }
  }

  private validateAddressForNetwork(address: string, network: FundingNetwork): void {
    const pattern = ADDRESS_PATTERNS[network];
    if (!pattern.test(address.trim())) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'INVALID_DEPOSIT_ADDRESS',
        `${network} 地址格式不正确`
      );
    }
  }
}
