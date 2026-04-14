import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { PublicLegalController } from './public-legal.controller';
import { PublicLegalService } from './public-legal.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicLegalController],
  providers: [PublicLegalService],
  exports: [PublicLegalService]
})
export class PublicLegalModule {}
