import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators/roles.decorator';
import { GetSettingsDto } from './dto/get-settings.dto';
import {
  UpdateSettingDto,
  UpdateSettingsBatchDto,
  UpdateAdminAccountDto,
  UpdateTradingChannelsDto,
  UpdateCustomerServiceDto,
  UpdateLatencyDto,
  UpdateShareConfigDto,
  UpdateIpWhitelistDto,
  UpdateDepositNoticeDto,
} from './dto/update-settings.dto';

@Controller('admin/settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 获取所有设置
   * GET /admin/settings
   */
  @Get()
  @Roles('admin')
  async getAllSettings(@Query() query: GetSettingsDto) {
    return this.settingsService.getAllSettings(query.category);
  }

  /**
   * 更新单个设置
   * PUT /admin/settings
   */
  @Put()
  @Roles('admin')
  async updateSetting(@Body() dto: UpdateSettingDto) {
    return this.settingsService.updateSetting(dto);
  }

  /**
   * 批量更新设置
   * PUT /admin/settings/batch
   */
  @Put('batch')
  @Roles('admin')
  async updateSettingsBatch(@Body() dto: UpdateSettingsBatchDto) {
    return this.settingsService.updateSettingsBatch(dto);
  }

  /**
   * 更新管理员账号
   * PUT /admin/settings/admin-account
   */
  @Put('admin-account')
  @Roles('admin')
  async updateAdminAccount(@Body() dto: UpdateAdminAccountDto) {
    await this.settingsService.updateAdminAccount(dto);
    return { message: '管理员账号已更新' };
  }

  /**
   * 获取交易渠道设置
   * GET /admin/settings/trading/channels
   */
  @Get('trading/channels')
  @Roles('admin')
  async getTradingChannels() {
    return {
      data: await this.settingsService.getTradingChannels(),
    };
  }

  /**
   * 更新交易渠道设置
   * PUT /admin/settings/trading/channels
   */
  @Put('trading/channels')
  @Roles('admin')
  async updateTradingChannels(@Body() dto: UpdateTradingChannelsDto) {
    await this.settingsService.updateTradingChannels(dto);
    return { message: '交易渠道设置已更新' };
  }

  /**
   * 获取客服窗口设置
   * GET /admin/settings/customer-service
   */
  @Get('customer-service')
  @Roles('admin')
  async getCustomerService() {
    return {
      data: await this.settingsService.getCustomerService(),
    };
  }

  /**
   * 更新客服窗口设置
   * PUT /admin/settings/customer-service
   */
  @Put('customer-service')
  @Roles('admin')
  async updateCustomerService(@Body() dto: UpdateCustomerServiceDto) {
    await this.settingsService.updateCustomerService(dto);
    return { message: '客服窗口设置已更新' };
  }

  /**
   * 获取延迟设置
   * GET /admin/settings/latency
   */
  @Get('latency')
  @Roles('admin')
  async getLatency() {
    return {
      data: await this.settingsService.getLatency(),
    };
  }

  /**
   * 更新延迟设置
   * PUT /admin/settings/latency
   */
  @Put('latency')
  @Roles('admin')
  async updateLatency(@Body() dto: UpdateLatencyDto) {
    await this.settingsService.updateLatency(dto);
    return { message: '延迟设置已更新' };
  }

  /**
   * 获取托管模式设置
   * GET /admin/settings/trading/managed-mode
   */
  @Get('trading/managed-mode')
  @Roles('admin')
  async getManagedMode() {
    return {
      data: {
        enabled: await this.settingsService.getManagedMode(),
      },
    };
  }

  /**
   * 更新托管模式设置
   * PUT /admin/settings/trading/managed-mode
   */
  @Put('trading/managed-mode')
  @Roles('admin')
  async updateManagedMode(@Body() dto: { enabled: boolean }) {
    await this.settingsService.updateManagedMode(dto.enabled);
    return { message: '托管模式设置已更新' };
  }

  /**
   * 获取分享内容设置
   * GET /admin/settings/share/config
   */
  @Get('share/config')
  @Roles('admin')
  async getShareConfig() {
    return {
      data: await this.settingsService.getShareConfig(),
    };
  }

  /**
   * 更新分享内容设置
   * PUT /admin/settings/share/config
   */
  @Put('share/config')
  @Roles('admin')
  async updateShareConfig(@Body() dto: UpdateShareConfigDto) {
    await this.settingsService.updateShareConfig(dto);
    return { message: '分享内容设置已更新' };
  }

  /**
   * 获取 IP 白名单设置
   * GET /admin/settings/ip-whitelist
   */
  @Get('ip-whitelist')
  @Roles('admin')
  async getIpWhitelist() {
    return {
      data: await this.settingsService.getIpWhitelist(),
    };
  }

  /**
   * 更新 IP 白名单设置
   * PUT /admin/settings/ip-whitelist
   */
  @Put('ip-whitelist')
  @Roles('admin')
  async updateIpWhitelist(@Body() dto: UpdateIpWhitelistDto) {
    await this.settingsService.updateIpWhitelist(dto);
    return { message: 'IP 白名单设置已更新' };
  }

  /**
   * 获取入金地址说明公告
   * GET /admin/settings/deposit/notice
   */
  @Get('deposit/notice')
  @Roles('admin')
  async getDepositNotice() {
    return {
      data: await this.settingsService.getDepositNotice(),
    };
  }

  /**
   * 更新入金地址说明公告
   * PUT /admin/settings/deposit/notice
   */
  @Put('deposit/notice')
  @Roles('admin')
  async updateDepositNotice(@Body() dto: UpdateDepositNoticeDto) {
    await this.settingsService.updateDepositNotice(dto);
    return { message: '入金地址说明公告已更新' };
  }

  /**
   * 获取单个设置（必须放在最后，避免匹配其他路由）
   * GET /admin/settings/:key
   */
  @Get(':key')
  @Roles('admin')
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }
}

