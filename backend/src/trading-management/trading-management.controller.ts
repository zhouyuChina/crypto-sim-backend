import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { TradingManagementService } from './trading-management.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTradingSessionDto } from './dto/create-trading-session.dto';
import { QueryTradingSessionsDto } from './dto/query-trading-sessions.dto';
import { QueryTradingCyclesDto } from './dto/query-trading-cycles.dto';

@Controller('admin/trading-management')
@Roles('admin')
export class TradingManagementController {
  constructor(private readonly tradingManagementService: TradingManagementService) {}

  // ========== 托管会话管理 ==========

  /**
   * 创建交易托管会话
   */
  @Post('sessions')
  async createSession(
    @Body() dto: CreateTradingSessionDto,
    @Request() req: any
  ) {
    const adminId = req.user?.sub || 'unknown';
    const adminName = req.user?.username || undefined;

    const session = await this.tradingManagementService.createSession(dto, adminId, adminName);

    return {
      data: session,
      message: '交易托管会话创建成功'
    };
  }

  /**
   * 查询托管会话列表
   */
  @Get('sessions')
  async findAllSessions(@Query() dto: QueryTradingSessionsDto) {
    return {
      data: await this.tradingManagementService.findAllSessions(dto)
    };
  }

  /**
   * 获取单个托管会话详情
   */
  @Get('sessions/:id')
  async findOneSession(@Param('id') id: string) {
    return {
      data: await this.tradingManagementService.findOneSession(id)
    };
  }

  /**
   * 停止托管会话
   */
  @Put('sessions/:id/stop')
  async stopSession(@Param('id') id: string) {
    const session = await this.tradingManagementService.stopSession(id);

    return {
      data: session,
      message: '托管会话已停止'
    };
  }

  /**
   * 暂停托管会话
   */
  @Put('sessions/:id/pause')
  async pauseSession(@Param('id') id: string) {
    const session = await this.tradingManagementService.pauseSession(id);

    return {
      data: session,
      message: '托管会话已暂停'
    };
  }

  /**
   * 恢复托管会话
   */
  @Put('sessions/:id/resume')
  async resumeSession(@Param('id') id: string) {
    const session = await this.tradingManagementService.resumeSession(id);

    return {
      data: session,
      message: '托管会话已恢复'
    };
  }

  /**
   * 删除托管会话
   */
  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    return {
      data: await this.tradingManagementService.deleteSession(id)
    };
  }

  // ========== 交易周期管理 ==========

  /**
   * 查询交易周期列表
   */
  @Get('cycles')
  async findAllCycles(@Query() dto: QueryTradingCyclesDto) {
    return {
      data: await this.tradingManagementService.findAllCycles(dto)
    };
  }
}
