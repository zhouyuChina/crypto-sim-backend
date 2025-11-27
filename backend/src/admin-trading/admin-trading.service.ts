import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AdminTradingService {
  private readonly logger = new Logger(AdminTradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 获取当前活跃交易列表（PENDING 状态）
   */
  async getActiveTransactions() {
    const transactions = await this.prisma.transactionLog.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // 限制返回最近100条
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return transactions;
  }

  /**
   * 管理员编辑交易
   */
  async editTransaction(transactionId: string, adminId: string, updates: any) {
    // 验证交易是否存在
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('交易不存在');
    }

    // 不允许编辑已结算或已取消的交易
    if (transaction.status === 'SETTLED' || transaction.status === 'CANCELED') {
      throw new BadRequestException('无法编辑已结算或已取消的交易');
    }

    // 更新交易 - 标记为人工调整
    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { id: transactionId },
      data: {
        ...updates,
        manualAdjusted: true,
        manualAdjustedById: adminId,
        manualAdjustedAt: new Date(),
        manualAdjustmentReason: `管理员编辑交易`,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // 发出事件通知
    this.eventEmitter.emit('transaction.edited', {
      transaction: updatedTransaction,
      adminId,
      updates,
    });

    this.logger.log(`交易 ${transactionId} 已被管理员 ${adminId} 编辑`);

    return updatedTransaction;
  }

  /**
   * 管理员取消交易
   */
  async cancelTransaction(transactionId: string, adminId: string, reason?: string) {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('交易不存在');
    }

    if (transaction.status === 'SETTLED' || transaction.status === 'CANCELED') {
      throw new BadRequestException('交易已结算或已取消');
    }

    const oldStatus = transaction.status;

    // 更新交易状态为取消
    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELED',
        manualAdjusted: true,
        manualAdjustedById: adminId,
        manualAdjustedByName: '', // 需要传入管理员名称
        manualAdjustedAt: new Date(),
        manualAdjustmentReason: reason || '管理员取消',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // 发出事件通知
    this.eventEmitter.emit('transaction.cancelled', {
      transaction: updatedTransaction,
      adminId,
      reason,
      oldStatus,
    });

    this.logger.log(`交易 ${transactionId} 已被管理员 ${adminId} 取消`);

    return updatedTransaction;
  }

  /**
   * 管理员强制结算交易
   */
  async forceSettleTransaction(
    transactionId: string,
    adminId: string,
    settlementPrice?: number,
  ) {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('交易不存在');
    }

    if (transaction.status === 'SETTLED' || transaction.status === 'CANCELED') {
      throw new BadRequestException('交易已结算或已取消');
    }

    const oldStatus = transaction.status;

    // 强制结算
    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { id: transactionId },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        exitPrice: settlementPrice ? settlementPrice.toString() : transaction.currentPrice,
        manualAdjusted: true,
        manualAdjustedById: adminId,
        manualAdjustedAt: new Date(),
        manualAdjustmentReason: `管理员强制结算${settlementPrice ? ` - 结算价: ${settlementPrice}` : ''}`,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // 发出事件通知
    this.eventEmitter.emit('transaction.force-settled', {
      transaction: updatedTransaction,
      adminId,
      settlementPrice,
      oldStatus,
    });

    this.logger.log(`交易 ${transactionId} 已被管理员 ${adminId} 强制结算`);

    return updatedTransaction;
  }

  /**
   * 获取交易详情
   */
  async getTransactionById(transactionId: string) {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('交易不存在');
    }

    return transaction;
  }
}
