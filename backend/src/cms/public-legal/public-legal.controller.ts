import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

import { PatchPublicLegalContentDto } from './dto/patch-public-legal-content.dto';
import { PublishPublicLegalContentDto } from './dto/publish-public-legal-content.dto';
import { UpsertPublicLegalContentDto } from './dto/upsert-public-legal-content.dto';
import { PublicLegalService } from './public-legal.service';

@Controller('admin/cms/public-legal')
@Roles('admin')
export class PublicLegalController {
  constructor(private readonly publicLegalService: PublicLegalService) {}

  @Get()
  async findAll() {
    return this.publicLegalService.findAll();
  }

  @Get(':locale')
  async findOne(@Param('locale') locale: string) {
    return this.publicLegalService.findOne(locale);
  }

  @Put(':locale')
  async upsert(
    @Param('locale') locale: string,
    @Body() dto: UpsertPublicLegalContentDto,
    @CurrentUser() admin: { id?: string; sub?: string }
  ) {
    return this.publicLegalService.upsert(locale, dto, admin.id ?? admin.sub ?? 'unknown-admin');
  }

  @Patch(':locale')
  async patch(
    @Param('locale') locale: string,
    @Body() dto: PatchPublicLegalContentDto,
    @CurrentUser() admin: { id?: string; sub?: string }
  ) {
    return this.publicLegalService.patch(locale, dto, admin.id ?? admin.sub ?? 'unknown-admin');
  }

  @Delete(':locale')
  async remove(@Param('locale') locale: string) {
    return this.publicLegalService.remove(locale);
  }

  @Post(':locale/publish')
  async publish(
    @Param('locale') locale: string,
    @Body() dto: PublishPublicLegalContentDto,
    @CurrentUser() admin: { id?: string; sub?: string }
  ) {
    return this.publicLegalService.publish(locale, dto, admin.id ?? admin.sub ?? 'unknown-admin');
  }
}
