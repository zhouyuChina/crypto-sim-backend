import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { FrontendIpWhitelistController } from './frontend-ip-whitelist.controller';
import { FrontendIpWhitelistService } from './frontend-ip-whitelist.service';

@Module({
  imports: [PrismaModule],
  controllers: [FrontendIpWhitelistController],
  providers: [FrontendIpWhitelistService],
  exports: [FrontendIpWhitelistService],
})
export class FrontendIpWhitelistModule {}
