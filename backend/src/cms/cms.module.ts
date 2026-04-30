import { Module } from '@nestjs/common';

import { FundingModule } from '../funding/funding.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { CarouselsModule } from './carousels/carousels.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TradingPerformanceModule } from './trading-performance/trading-performance.module';
import { PublicLegalModule } from './public-legal/public-legal.module';
import { TutorialModule } from './tutorial/tutorial.module';
import { CmsFundingPendingController } from './funding-pending/cms-funding-pending.controller';

@Module({
  imports: [
    FundingModule,
    TestimonialsModule,
    CarouselsModule,
    LeaderboardModule,
    TradingPerformanceModule,
    PublicLegalModule,
    TutorialModule,
  ],
  controllers: [CmsFundingPendingController],
  exports: [
    TestimonialsModule,
    CarouselsModule,
    LeaderboardModule,
    TradingPerformanceModule,
    PublicLegalModule,
    TutorialModule,
  ],
})
export class CmsModule {}
