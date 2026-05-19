import { Module } from '@nestjs/common';

import { DepositAddressModule } from '../deposit-address/deposit-address.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AdminFundingController } from './admin-funding.controller';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';

@Module({
  imports: [PrismaModule, DepositAddressModule],
  controllers: [FundingController, AdminFundingController],
  providers: [FundingService],
  exports: [FundingService]
})
export class FundingModule {}
