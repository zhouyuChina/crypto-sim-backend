import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { MarketSessionService } from './market-session.service';
import { GetSubMarketCyclesDto } from './dto/get-sub-market-cycles.dto';

@Controller('market-sessions')
export class MarketSessionController {
  constructor(private readonly marketSessionService: MarketSessionService) {}

  /**
   * 获取当前活跃的大盘（用户端）
   * GET /api/market-sessions/active
   */
  @Get('active')
  @Public()
  async findActive() {
    return await this.marketSessionService.findActive();
  }

  /**
   * 获取小盘的当前周期
   * GET /api/market-sessions/sub-markets/:subMarketId/current-cycle
   */
  @Get('sub-markets/:subMarketId/current-cycle')
  @Public()
  async getCurrentCycle(@Param('subMarketId') subMarketId: string) {
    return await this.marketSessionService.getCurrentCycle(subMarketId);
  }

  /**
   * 获取小盘历史周期（用户端）
   * GET /api/market-sessions/sub-markets/:subMarketId/cycles
   */
  @Get('sub-markets/:subMarketId/cycles')
  @Public()
  async getSubMarketCycles(
    @Param('subMarketId') subMarketId: string,
    @Query() dto: GetSubMarketCyclesDto,
  ) {
    return await this.marketSessionService.getSubMarketCycles(subMarketId, dto);
  }

  /**
   * 获取大盘详情（用户端）
   * GET /api/market-sessions/:id
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return await this.marketSessionService.findOne(id);
  }
}
