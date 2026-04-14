import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AdminFundingController } from './admin-funding.controller';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';

@Module({
  imports: [PrismaModule],
  controllers: [FundingController, AdminFundingController],
  providers: [FundingService],
  exports: [FundingService]
})
export class FundingModule {}
