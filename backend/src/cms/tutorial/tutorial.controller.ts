import { Body, Controller, Get, Put } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

import { UpsertTutorialDto } from './dto/upsert-tutorial.dto';
import { TutorialService } from './tutorial.service';

@Controller('admin/cms/tutorial')
@Roles('admin')
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  @Get()
  async findOne() {
    return this.tutorialService.findOne();
  }

  @Put()
  async upsert(
    @Body() dto: UpsertTutorialDto,
    @CurrentUser() admin: { id?: string; sub?: string },
  ) {
    return this.tutorialService.upsert(dto, admin.id ?? admin.sub ?? 'unknown-admin');
  }
}
