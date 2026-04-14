import { Module } from '@nestjs/common';

import { TestimonialsModule } from './testimonials/testimonials.module';
import { CarouselsModule } from './carousels/carousels.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TradingPerformanceModule } from './trading-performance/trading-performance.module';
import { PublicLegalModule } from './public-legal/public-legal.module';

@Module({
  imports: [
    TestimonialsModule,
    CarouselsModule,
    LeaderboardModule,
    TradingPerformanceModule,
    PublicLegalModule
  ],
  exports: [
    TestimonialsModule,
    CarouselsModule,
    LeaderboardModule,
    TradingPerformanceModule,
    PublicLegalModule
  ]
})
export class CmsModule {}
