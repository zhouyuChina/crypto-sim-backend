import { Controller, Get, UseGuards, Header } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 获取分享内容设置（客户端）
   * GET /settings/share/config
   */
  @Get('share/config')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getShareConfig() {
    return {
      data: await this.settingsService.getShareConfig(),
    };
  }

  /**
   * 获取入金地址说明公告（客户端）
   * GET /settings/deposit/notice
   */
  @Get('deposit/notice')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getDepositNotice() {
    return {
      data: await this.settingsService.getDepositNotice(),
    };
  }
}
