import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { PublicTutorialController } from './public-tutorial.controller';
import { TutorialController } from './tutorial.controller';
import { TutorialService } from './tutorial.service';

@Module({
  imports: [PrismaModule],
  controllers: [TutorialController, PublicTutorialController],
  providers: [TutorialService],
  exports: [TutorialService],
})
export class TutorialModule {}
