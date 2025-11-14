import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionLogModule } from '../transaction-log/transaction-log.module';
import { MarketSessionService } from './market-session.service';
import { MarketSessionController } from './market-session.controller';
import { MarketSessionAdminController } from './market-session-admin.controller';
import { SubMarketCycleWatcherService } from './sub-market-cycle-watcher.service';

@Module({
  imports: [PrismaModule, TransactionLogModule],
  controllers: [MarketSessionController, MarketSessionAdminController],
  providers: [MarketSessionService, SubMarketCycleWatcherService],
  exports: [MarketSessionService],
})
export class MarketSessionModule {}
