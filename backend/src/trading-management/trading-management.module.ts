import { Module } from '@nestjs/common';
import { TradingManagementService } from './trading-management.service';
import { TradingManagementController } from './trading-management.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TradingManagementController],
  providers: [TradingManagementService],
  exports: [TradingManagementService]
})
export class TradingManagementModule {}
