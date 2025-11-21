import { Controller, Get, UseGuards, Header } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 获取入金地址设置（客户端）
   * GET /settings/deposit/address
   */
  @Get('deposit/address')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getDepositAddress() {
    return {
      data: await this.settingsService.getDepositAddress(),
    };
  }
}
