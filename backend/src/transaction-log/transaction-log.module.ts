import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminTradingModule } from '../admin-trading/admin-trading.module';
import { QueueModule } from '../queue/queue.module';
import { TransactionLogService } from './transaction-log.service';
import { TransactionLogController } from './transaction-log.controller';
import { AdminTransactionLogController } from './admin-transaction-log.controller';

@Module({
  imports: [
    PrismaModule,
    MarketDataModule,
    SettingsModule,
    AdminTradingModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [TransactionLogController, AdminTransactionLogController],
  providers: [TransactionLogService],
  exports: [TransactionLogService],
})
export class TransactionLogModule {}
