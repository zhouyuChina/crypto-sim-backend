import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { QueryAdminFundingRecordsDto } from '../../funding/dto/query-admin-funding-records.dto';
import { FundingService } from '../../funding/funding.service';

/**
 * CMS 侧「出入金待审核」：数据即 FundingRecord.status=PENDING。
 * 审核动作仍使用 POST /api/admin/funding/records/:id/review。
 */
@Controller('admin/cms/deposit-withdraw')
@Roles('admin')
export class CmsFundingPendingController {
  constructor(private readonly fundingService: FundingService) {}

  @Get('pending')
  findPending(@Query() query: QueryAdminFundingRecordsDto) {
    return this.fundingService.findAdminRecords({ ...query, status: 'pending' });
  }

  @Get('pending/count')
  getPendingCount(@Query('type') type?: string) {
    return this.fundingService.countAdminPendingRecords(type ? { type } : {});
  }
}
