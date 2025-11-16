import { Module } from '@nestjs/common';
import { AdminTradingGateway } from './admin-trading.gateway';
import { AdminTradingService } from './admin-trading.service';
import { TransactionListener } from './transaction.listener';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminTradingGateway, AdminTradingService, TransactionListener],
  exports: [AdminTradingService, AdminTradingGateway],
})
export class AdminTradingModule {}
