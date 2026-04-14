import { Controller, Get, Post, Query, Body } from '@nestjs/common';

import type { UserEntity } from '../auth/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { QueryFundingRecordsDto } from './dto/query-funding-records.dto';
import { FundingService } from './funding.service';

@Controller('deposit-withdraw')
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Post('deposit')
  async createDeposit(@CurrentUser() user: UserEntity, @Body() dto: CreateDepositDto) {
    return this.fundingService.createDeposit(user.id, dto);
  }

  @Post('withdraw')
  async createWithdraw(@CurrentUser() user: UserEntity, @Body() dto: CreateWithdrawDto) {
    return this.fundingService.createWithdraw(user, dto);
  }

  @Get()
  async findUserRecords(@CurrentUser() user: UserEntity, @Query() query: QueryFundingRecordsDto) {
    return this.fundingService.findUserRecords(user.id, query);
  }
}
