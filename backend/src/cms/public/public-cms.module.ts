import { Module } from '@nestjs/common';

import { TestimonialsModule } from '../testimonials/testimonials.module';
import { CarouselsModule } from '../carousels/carousels.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { TradingPerformanceModule } from '../trading-performance/trading-performance.module';
import { PublicTestimonialsController } from './public-testimonials.controller';
import { PublicCarouselsController } from './public-carousels.controller';
import { PublicLeaderboardController } from './public-leaderboard.controller';
import { PublicTradingPerformanceController } from './public-trading-performance.controller';
import { PublicLegalModule } from '../public-legal/public-legal.module';
import { PublicPublicLegalController } from './public-legal.controller';

@Module({
  imports: [
    TestimonialsModule,
    CarouselsModule,
    LeaderboardModule,
    TradingPerformanceModule,
    PublicLegalModule
  ],
  controllers: [
    PublicTestimonialsController,
    PublicCarouselsController,
    PublicLeaderboardController,
    PublicTradingPerformanceController,
    PublicPublicLegalController
  ]
})
export class PublicCmsModule {}
