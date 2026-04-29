import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { QueueService } from './queue.service';
import { QueueHealthIndicator } from './queue.health';
import { NotificationProcessor } from './processors/notification.processor';
import { MarketDataProcessor } from './processors/market-data.processor';
import { TransactionSettleProcessor } from './processors/transaction-settle.processor';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionLogModule } from '../transaction-log/transaction-log.module';

@Module({
  imports: [
    MailModule,
    PrismaModule,
    forwardRef(() => TransactionLogModule),
    BullModule.registerQueue(
      {
        name: 'notifications'
      },
      {
        name: 'market-data'
      },
      {
        name: 'transaction-settle'
      }
    )
  ],
  providers: [
    QueueService,
    QueueHealthIndicator,
    NotificationProcessor,
    MarketDataProcessor,
    TransactionSettleProcessor
  ],
  exports: [QueueService, QueueHealthIndicator, BullModule]
})
export class QueueModule {}
