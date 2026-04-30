import { Controller, Get } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';

import { TutorialService } from './tutorial.service';

@Controller('cms/tutorial')
export class PublicTutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  @Public()
  @Get()
  async find() {
    return this.tutorialService.findOne();
  }
}
