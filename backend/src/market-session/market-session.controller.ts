import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { MarketSessionService } from './market-session.service';

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
   * 获取大盘详情（用户端）
   * GET /api/market-sessions/:id
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return await this.marketSessionService.findOne(id);
  }
}
