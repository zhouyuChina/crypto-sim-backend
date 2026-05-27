import { Module, forwardRef } from '@nestjs/common';
import { AdminTradingGateway } from './admin-trading.gateway';
import { AdminTradingService } from './admin-trading.service';
import { AdminTradingSseService } from './admin-trading-sse.service';
import { AdminTradingSseController } from './admin-trading-sse.controller';
import { TransactionListener } from './transaction.listener';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionLogModule } from '../transaction-log/transaction-log.module';

@Module({
  imports: [PrismaModule, forwardRef(() => TransactionLogModule)],
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
