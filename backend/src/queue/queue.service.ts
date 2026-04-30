import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

interface NotificationJob {
  template: string;
  payload: Record<string, unknown>;
  recipient: string;
}

interface MarketDataJob {
  symbol: string;
  type: 'trade' | 'kline' | 'ticker';
  payload: Record<string, unknown>;
}

interface TransactionSettleJob {
  orderNumber: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJob>,
    @InjectQueue('market-data') private readonly marketDataQueue: Queue<MarketDataJob>,
    @InjectQueue('transaction-settle')
    private readonly transactionSettleQueue: Queue<TransactionSettleJob>
  ) {}

  /**
   * 投递交易到期结算任务
   * @param orderNumber 订单号
   * @param delayMs 延迟毫秒数（duration * 1000）
   */
  async enqueueTransactionSettle(orderNumber: string, delayMs: number): Promise<void> {
    await this.transactionSettleQueue.add(
      'settle',
      { orderNumber },
      {
        delay: delayMs,
        jobId: `settle:${orderNumber}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );
    this.logger.debug(
      `Enqueued settle job for order=${orderNumber}, delay=${delayMs}ms`,
    );
  }

  async enqueueNotification(job: NotificationJob): Promise<void> {
    await this.notificationsQueue.add('send-notification', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    });
    this.logger.debug(`Notification job queued with template ${job.template}`);
  }

  async enqueueMarketData(job: MarketDataJob): Promise<void> {
    await this.marketDataQueue.add(job.type, job, {
      removeOnComplete: true,
      removeOnFail: false
    });
    this.logger.verbose(`Market data job queued for ${job.symbol} [${job.type}]`);
  }
}
