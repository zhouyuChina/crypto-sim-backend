import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { TransactionLogService } from '../../transaction-log/transaction-log.service';

interface TransactionSettleJob {
  orderNumber: string;
}

@Processor('transaction-settle', { concurrency: 10 })
export class TransactionSettleProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionSettleProcessor.name);

  constructor(
    @Inject(forwardRef(() => TransactionLogService))
    private readonly transactionLogService: TransactionLogService,
  ) {
    super();
  }

  async process(job: Job<TransactionSettleJob>): Promise<void> {
    const { orderNumber } = job.data;
    this.logger.log(`[Settle] 处理到期结算任务: ${orderNumber} (jobId=${job.id})`);

    try {
      await this.transactionLogService.autoSettleByOrderNumber(orderNumber);
    } catch (error) {
      this.logger.error(
        `[Settle] 结算失败: ${orderNumber}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
