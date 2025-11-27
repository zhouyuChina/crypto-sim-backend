import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { QueryOperatorsDto } from './dto/query-operators.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class OperatorsService {
  private readonly logger = new Logger(OperatorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建操作员
   */
  async create(dto: CreateOperatorDto, adminId: string) {
    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('该邮箱已被使用');
    }

    // 手机号不需要唯一性检查，允许多个用户使用相同手机号

    // 创建操作员（使用一个默认密码哈希，因为他们不需要登录）
    const defaultPasswordHash = await bcrypt.hash(`custom_${uuidv4()}`, 12);

    const operator = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        phoneNumber: dto.phoneNumber,
        passwordHash: defaultPasswordHash,
        avatar: dto.avatar,
        demoBalance: dto.demoBalance ?? 10000,
        realBalance: dto.realBalance ?? 0,
        verificationStatus: dto.verificationStatus ?? 'PENDING',
        isCustomMember: true,
        createdBy: adminId,
        roles: ['trader'],
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        demoBalance: true,
        realBalance: true,
        accountBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
        verificationStatus: true,
        isActive: true,
        isCustomMember: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`操作员已创建: ${operator.email} (ID: ${operator.id})`);

    return {
      ...operator,
      demoBalance: Number(operator.demoBalance),
      realBalance: Number(operator.realBalance),
      accountBalance: Number(operator.accountBalance),
      totalProfitLoss: Number(operator.totalProfitLoss),
      winRate: Number(operator.winRate),
    };
  }

  /**
   * 获取操作员列表
   */
  async findAll(query: QueryOperatorsDto) {
    const {
      page = 1,
      pageSize = 10,
      search,
      verificationStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
    } = query;

    const skip = (page - 1) * pageSize;

    // 构建 where 条件
    const where: Prisma.UserWhereInput = {
      isCustomMember: true, // 只查询操作员
    };

    // 搜索过滤
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 验证状态过滤
    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    // 激活状态过滤
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 查询数据
    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          phoneNumber: true,
          avatar: true,
          demoBalance: true,
          realBalance: true,
          accountBalance: true,
          totalProfitLoss: true,
          totalTrades: true,
          winRate: true,
          verificationStatus: true,
          isActive: true,
          isCustomMember: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: members.map((m) => ({
        ...m,
        demoBalance: Number(m.demoBalance),
        realBalance: Number(m.realBalance),
        accountBalance: Number(m.accountBalance),
        totalProfitLoss: Number(m.totalProfitLoss),
        winRate: Number(m.winRate),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取单个操作员
   */
  async findOne(id: string) {
    const member = await this.prisma.user.findFirst({
      where: {
        id,
        isCustomMember: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        demoBalance: true,
        realBalance: true,
        accountBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
        verificationStatus: true,
        isActive: true,
        isCustomMember: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!member) {
      throw new NotFoundException('操作员不存在');
    }

    return {
      ...member,
      demoBalance: Number(member.demoBalance),
      realBalance: Number(member.realBalance),
      accountBalance: Number(member.accountBalance),
      totalProfitLoss: Number(member.totalProfitLoss),
      winRate: Number(member.winRate),
    };
  }

  /**
   * 更新操作员
   */
  async update(id: string, dto: UpdateOperatorDto) {
    // 检查会员是否存在
    const existingMember = await this.prisma.user.findFirst({
      where: { id, isCustomMember: true },
    });

    if (!existingMember) {
      throw new NotFoundException('操作员不存在');
    }

    // 如果更新邮箱，检查是否冲突
    if (dto.email && dto.email !== existingMember.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    // 手机号不需要唯一性检查，允许多个用户使用相同手机号

    const updatedMember = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        demoBalance: true,
        realBalance: true,
        accountBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
        verificationStatus: true,
        isActive: true,
        isCustomMember: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`操作员已更新: ${updatedMember.email} (ID: ${id})`);

    return {
      ...updatedMember,
      demoBalance: Number(updatedMember.demoBalance),
      realBalance: Number(updatedMember.realBalance),
      accountBalance: Number(updatedMember.accountBalance),
      totalProfitLoss: Number(updatedMember.totalProfitLoss),
      winRate: Number(updatedMember.winRate),
    };
  }

  /**
   * 删除操作员
   */
  async remove(id: string) {
    const member = await this.prisma.user.findFirst({
      where: { id, isCustomMember: true },
    });

    if (!member) {
      throw new NotFoundException('操作员不存在');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`操作员已删除: ${member.email} (ID: ${id})`);

    return { message: '操作员已删除' };
  }

  /**
   * 为操作员创建交易流水
   */
  async createTransaction(memberId: string, dto: CreateTransactionDto) {
    // 检查会员是否存在
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, isCustomMember: true },
    });

    if (!member) {
      throw new NotFoundException('操作员不存在');
    }

    // 生成唯一的订单号
    const orderNumber = `TX${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const accountType = dto.accountType ?? 'DEMO';

    // 查找当前活跃的大盘（真实仓需要关联大盘）
    let marketSessionId: string | null = null;
    if (accountType === 'REAL') {
      const activeMarketSession = await this.prisma.marketSession.findFirst({
        where: {
          status: 'ACTIVE',
        },
        orderBy: { startTime: 'desc' },
      });
      if (activeMarketSession) {
        marketSessionId = activeMarketSession.id;
      }
    }

    const transaction = await this.prisma.transactionLog.create({
      data: {
        userId: memberId,
        userName: member.displayName,
        orderNumber,
        assetType: dto.assetType,
        direction: dto.direction,
        entryTime: new Date(dto.entryTime),
        expiryTime: new Date(dto.expiryTime),
        duration: dto.duration,
        entryPrice: dto.entryPrice,
        exitPrice: dto.exitPrice,
        spread: dto.spread,
        investAmount: dto.investAmount,
        returnRate: dto.returnRate,
        actualReturn: dto.actualReturn,
        status: dto.status ?? 'SETTLED',
        accountType,
        marketSessionId, // 关联大盘
        settledAt: dto.status === 'SETTLED' ? new Date() : null,
      },
    });

    this.logger.log(`为操作员创建交易流水: ${member.email} (订单: ${orderNumber})`);

    return {
      ...transaction,
      entryPrice: Number(transaction.entryPrice),
      exitPrice: transaction.exitPrice ? Number(transaction.exitPrice) : null,
      currentPrice: transaction.currentPrice ? Number(transaction.currentPrice) : null,
      spread: Number(transaction.spread),
      investAmount: Number(transaction.investAmount),
      returnRate: Number(transaction.returnRate),
      actualReturn: Number(transaction.actualReturn),
    };
  }

  /**
   * 获取操作员的交易流水列表
   */
  async getTransactions(
    memberId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    // 检查会员是否存在
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, isCustomMember: true },
    });

    if (!member) {
      throw new NotFoundException('操作员不存在');
    }

    const skip = (page - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      this.prisma.transactionLog.findMany({
        where: { userId: memberId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transactionLog.count({
        where: { userId: memberId },
      }),
    ]);

    return {
      data: transactions.map((tx) => ({
        ...tx,
        entryPrice: Number(tx.entryPrice),
        exitPrice: tx.exitPrice ? Number(tx.exitPrice) : null,
        currentPrice: tx.currentPrice ? Number(tx.currentPrice) : null,
        spread: Number(tx.spread),
        investAmount: Number(tx.investAmount),
        returnRate: Number(tx.returnRate),
        actualReturn: Number(tx.actualReturn),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 更新交易流水
   */
  async updateTransaction(
    memberId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ) {
    // 检查交易是否属于该会员
    const transaction = await this.prisma.transactionLog.findFirst({
      where: {
        id: transactionId,
        userId: memberId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('交易流水不存在');
    }

    const updateData: any = { ...dto };

    // 转换日期字符串
    if (dto.entryTime) {
      updateData.entryTime = new Date(dto.entryTime);
    }
    if (dto.expiryTime) {
      updateData.expiryTime = new Date(dto.expiryTime);
    }

    // 如果状态改为已结算，更新结算时间
    if (dto.status === 'SETTLED' && transaction.status !== 'SETTLED') {
      updateData.settledAt = new Date();
    }

    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { id: transactionId },
      data: updateData,
    });

    this.logger.log(`交易流水已更新: ${transaction.orderNumber}`);

    return {
      ...updatedTransaction,
      entryPrice: Number(updatedTransaction.entryPrice),
      exitPrice: updatedTransaction.exitPrice ? Number(updatedTransaction.exitPrice) : null,
      currentPrice: updatedTransaction.currentPrice ? Number(updatedTransaction.currentPrice) : null,
      spread: Number(updatedTransaction.spread),
      investAmount: Number(updatedTransaction.investAmount),
      returnRate: Number(updatedTransaction.returnRate),
      actualReturn: Number(updatedTransaction.actualReturn),
    };
  }

  /**
   * 删除交易流水
   */
  async deleteTransaction(memberId: string, transactionId: string) {
    // 检查交易是否属于该会员
    const transaction = await this.prisma.transactionLog.findFirst({
      where: {
        id: transactionId,
        userId: memberId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('交易流水不存在');
    }

    await this.prisma.transactionLog.delete({
      where: { id: transactionId },
    });

    this.logger.log(`交易流水已删除: ${transaction.orderNumber}`);

    return { message: '交易流水已删除' };
  }
}
