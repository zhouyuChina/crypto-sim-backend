import { Module } from '@nestjs/common';
import { AdminTradingGateway } from './admin-trading.gateway';
import { AdminTradingService } from './admin-trading.service';
import { AdminTradingSseService } from './admin-trading-sse.service';
import { AdminTradingSseController } from './admin-trading-sse.controller';
import { TransactionListener } from './transaction.listener';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTradingSseController],
  providers: [
    AdminTradingGateway,
    AdminTradingService,
    AdminTradingSseService,
    TransactionListener,
  ],
  exports: [AdminTradingService, AdminTradingGateway],
})
export class AdminTradingModule {}
