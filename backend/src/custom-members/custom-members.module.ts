import { Module } from '@nestjs/common';
import { CustomMembersController } from './custom-members.controller';
import { CustomMembersService } from './custom-members.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomMembersController],
  providers: [CustomMembersService],
  exports: [CustomMembersService],
})
export class CustomMembersModule {}
