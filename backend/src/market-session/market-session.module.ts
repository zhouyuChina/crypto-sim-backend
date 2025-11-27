import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketSessionService } from './market-session.service';
import { MarketSessionController } from './market-session.controller';
import { MarketSessionAdminController } from './market-session-admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MarketSessionController, MarketSessionAdminController],
  providers: [MarketSessionService],
  exports: [MarketSessionService],
})
export class MarketSessionModule {}
