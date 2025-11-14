import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MarketSessionService } from './market-session.service';
import { CreateMarketSessionDto } from './dto/create-market-session.dto';
import { UpdateMarketSessionDto } from './dto/update-market-session.dto';
import { GetMarketSessionsDto } from './dto/get-market-sessions.dto';
import { GetSubMarketCyclesDto } from './dto/get-sub-market-cycles.dto';

@Controller('admin/market-sessions')
export class MarketSessionAdminController {
  constructor(private readonly marketSessionService: MarketSessionService) {}

  /**
   * 创建大盘
   * POST /api/admin/market-sessions
   */
  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateMarketSessionDto, @CurrentUser() admin: any) {
    return await this.marketSessionService.create(
      dto,
      admin.id,
      admin.displayName || admin.username,
    );
  }

  /**
   * 获取大盘列表
   * GET /api/admin/market-sessions
   */
  @Get()
  @Roles('admin')
  async findAll(@Query() dto: GetMarketSessionsDto) {
    return await this.marketSessionService.findAll(dto);
  }

  /**
   * 获取大盘详情
   * GET /api/admin/market-sessions/:id
   */
  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string) {
    return await this.marketSessionService.findOne(id);
  }

  /**
   * 获取小盘历史周期
   * GET /api/admin/market-sessions/sub-markets/:subMarketId/cycles
   */
  @Get('sub-markets/:subMarketId/cycles')
  @Roles('admin')
  async getSubMarketCycles(
    @Param('subMarketId') subMarketId: string,
    @Query() dto: GetSubMarketCyclesDto,
  ) {
    return await this.marketSessionService.getSubMarketCycles(subMarketId, dto);
  }

  /**
   * 更新大盘
   * PUT /api/admin/market-sessions/:id
   */
  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateMarketSessionDto) {
    return await this.marketSessionService.update(id, dto);
  }

  /**
   * 删除大盘
   * DELETE /api/admin/market-sessions/:id
   */
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return await this.marketSessionService.remove(id);
  }

  /**
   * 开启大盘
   * POST /api/admin/market-sessions/:id/start
   */
  @Post(':id/start')
  @Roles('admin')
  async start(@Param('id') id: string) {
    return await this.marketSessionService.start(id);
  }

  /**
   * 关闭大盘
   * POST /api/admin/market-sessions/:id/stop
   */
  @Post(':id/stop')
  @Roles('admin')
  async stop(@Param('id') id: string) {
    return await this.marketSessionService.stop(id);
  }
}
