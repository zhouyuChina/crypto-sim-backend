import { Body, Controller, Get, Put } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';

import { UpdateFrontendIpWhitelistDto } from './dto/update-frontend-ip-whitelist.dto';
import { FrontendIpWhitelistService } from './frontend-ip-whitelist.service';

@Controller('admin/frontend-ip-whitelist')
@Roles('admin')
export class FrontendIpWhitelistController {
  constructor(private readonly service: FrontendIpWhitelistService) {}

  @Get()
  findOne() {
    return this.service.findOne();
  }

  @Put()
  update(@Body() dto: UpdateFrontendIpWhitelistDto) {
    return this.service.update(dto);
  }
}
