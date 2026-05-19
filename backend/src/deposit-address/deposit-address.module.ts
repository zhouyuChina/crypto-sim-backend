import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AdminDepositAddressController } from './admin-deposit-address.controller';
import { DepositAddressRiskCheckerService } from './deposit-address-risk-checker.service';
import { DepositAddressService } from './deposit-address.service';
import { PublicDepositAddressController } from './public-deposit-address.controller';

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({ timeout: 10_000, maxRedirects: 5 }),
  ],
  controllers: [AdminDepositAddressController, PublicDepositAddressController],
  providers: [DepositAddressService, DepositAddressRiskCheckerService],
  exports: [DepositAddressService],
})
export class DepositAddressModule {}
