import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminTradingSseService } from './admin-trading-sse.service';
import { TransactionLogService } from '../transaction-log/transaction-log.service';

@Injectable()
export class AdminTradingService {
  private readonly logger = new Logger(AdminTradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => AdminTradingSseService))
    private readonly sseService: AdminTradingSseService,
    @Inject(forwardRef(() => TransactionLogService))
    private readonly transactionLogService: TransactionLogService,
  ) {}

  /**
   * 获取当前活跃交易列表（PENDING 状态）
   * @param accountType 可选，过滤账户类型：'DEMO' | 'REAL'，不传则返回全部
   */
  async getActiveTransactions(accountType?: 'DEMO' | 'REAL') {
    const transactions = await this.prisma.transactionLog.findMany({
      where: {
        status: 'PENDING',
        ...(accountType ? { accountType } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
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
   * result: 'WIN' | 'LOSE' 直接指定输赢（DEMO 单笔控制用）；不传时按各账户类型默认规则
   */
  async forceSettleTransaction(
    transactionId: string,
    adminId: string,
    settlementPrice?: number,
    result?: 'WIN' | 'LOSE',
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

    // 路由到 TransactionLogService 进行完整结算（含余额更新、广播、日志）
    return this.transactionLogService.forceSettleTransaction(transaction.orderNumber, {
      exitPrice: settlementPrice,
      result: result as 'WIN' | 'LOSE' | undefined,
      operatorId: adminId,
      reason: `管理员WebSocket强制结算${result ? ` - 指定结果: ${result}` : ''}`,
    });
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
