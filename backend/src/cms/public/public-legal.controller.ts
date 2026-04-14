import { Controller, Get, Query } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';
import { PublicLegalService } from '../public-legal/public-legal.service';

@Controller('public/cms/public-legal')
export class PublicPublicLegalController {
  constructor(private readonly publicLegalService: PublicLegalService) {}

  @Get()
  @Public()
  async findOne(@Query('locale') locale = 'zh-TW') {
    return this.publicLegalService.findPublishedByLocale(locale);
  }
}
