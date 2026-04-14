import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

import { QueryAdminFundingRecordsDto } from './dto/query-admin-funding-records.dto';
import { ReviewFundingRecordDto } from './dto/review-funding-record.dto';
import { FundingService } from './funding.service';

@Controller('admin/funding/records')
@Roles('admin')
export class AdminFundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Get()
  async findRecords(@Query() query: QueryAdminFundingRecordsDto) {
    return this.fundingService.findAdminRecords(query);
  }

  @Post(':id/review')
  async reviewRecord(
    @Param('id') id: string,
    @Body() dto: ReviewFundingRecordDto,
    @CurrentUser() admin: { id?: string; sub?: string }
  ) {
    return this.fundingService.reviewRecord(id, dto, admin.id ?? admin.sub ?? 'unknown-admin');
  }
}
