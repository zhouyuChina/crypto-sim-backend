import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { PrismaService } from '../prisma/prisma.service';

import { SettingResponseDto, SettingsByCategoryResponseDto } from './dto/settings-response.dto';
import type {
  UpdateSettingDto,
  UpdateSettingsBatchDto,
  UpdateAdminAccountDto,
  UpdateTradingChannelsDto,
  UpdateCustomerServiceDto,
  UpdateLatencyDto,
  UpdateShareConfigDto,
  UpdateIpWhitelistDto,
  IpWhitelistConfig,
  UpdateDepositNoticeDto,
  DepositNoticeConfig,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * 获取所有设置
   */
  async getAllSettings(category?: string): Promise<SettingsByCategoryResponseDto> {
    const where = category ? { category } : {};
    
    const settings = await this.prisma.systemSettings.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // 按分类组织
    const result: SettingsByCategoryResponseDto = {};
    
    for (const setting of settings) {
      if (!result[setting.category]) {
        result[setting.category] = [];
      }
      result[setting.category]!.push({
        id: setting.id,
        key: setting.key,
        value: setting.value as any,
        category: setting.category,
        description: setting.description,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
      });
    }

    return result;
  }

  /**
   * 获取单个设置
   */
  async getSetting(key: string): Promise<SettingResponseDto> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`设置 ${key} 不存在`);
    }

    return {
      id: setting.id,
      key: setting.key,
      value: setting.value as any,
      category: setting.category,
      description: setting.description,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * 更新单个设置
   */
  async updateSetting(dto: UpdateSettingDto): Promise<SettingResponseDto> {
    const setting = await this.prisma.systemSettings.upsert({
      where: { key: dto.key },
      update: {
        value: dto.value,
        description: dto.description,
      },
      create: {
        key: dto.key,
        value: dto.value,
        category: this.extractCategory(dto.key),
        description: dto.description,
      },
    });

    this.logger.log(`设置已更新: ${dto.key}`);

    return {
      id: setting.id,
      key: setting.key,
      value: setting.value as any,
      category: setting.category,
      description: setting.description,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * 批量更新设置
   */
  async updateSettingsBatch(dto: UpdateSettingsBatchDto): Promise<SettingResponseDto[]> {
    const results = await Promise.all(
      dto.settings.map(setting => this.updateSetting(setting))
    );

    this.logger.log(`批量更新了 ${results.length} 个设置`);
    return results;
  }

  /**
   * 更新管理员账号
   */
  async updateAdminAccount(dto: UpdateAdminAccountDto): Promise<void> {
    // 检查用户名是否已存在
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });

    if (existingAdmin && existingAdmin.username !== dto.username) {
      throw new BadRequestException(`用户名 ${dto.username} 已存在`);
    }

    // 查找第一个管理员账户（或者创建新的）
    const admin = await this.prisma.admin.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (admin) {
      // 更新现有管理员
      const passwordHash = await bcrypt.hash(dto.password, 12);

      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          username: dto.username,
          passwordHash,
          displayName: dto.displayName || admin.displayName,
        },
      });

      this.logger.log(`管理员账号已更新: ${dto.username}`);
    } else {
      throw new NotFoundException('未找到管理员账户，请先创建管理员');
    }
  }

  /**
   * 更新交易渠道设置
   */
  async updateTradingChannels(dto: UpdateTradingChannelsDto): Promise<void> {
    await this.updateSetting({
      key: 'trading.channels',
      value: dto.channels,
      description: '交易渠道配置',
    });

    this.logger.log('交易渠道设置已更新');
  }

  /**
   * 获取交易渠道设置
   */
  async getTradingChannels() {
    try {
      const setting = await this.getSetting('trading.channels');
      return setting.value;
    } catch {
      // 返回默认值
      return [];
    }
  }

  /**
   * 更新客服窗口设置
   */
  async updateCustomerService(dto: UpdateCustomerServiceDto): Promise<void> {
    await this.updateSetting({
      key: 'customer_service.config',
      value: dto.config,
      description: '客服窗口配置',
    });

    this.logger.log('客服窗口设置已更新');
  }

  /**
   * 获取客服窗口设置
   */
  async getCustomerService() {
    try {
      const setting = await this.getSetting('customer_service.config');
      return setting.value;
    } catch {
      // 返回默认值
      return {
        enabled: false,
        email: '',
        position: 'bottom-right',
        theme: 'light',
      };
    }
  }

  /**
   * 更新延迟设置
   */
  async updateLatency(dto: UpdateLatencyDto): Promise<void> {
    await this.updateSetting({
      key: 'latency.config',
      value: dto.config,
      description: '延迟设置配置',
    });

    this.logger.log('延迟设置已更新');
  }

  /**
   * 获取延迟设置
   */
  async getLatency() {
    try {
      const setting = await this.getSetting('latency.config');
      return setting.value;
    } catch {
      // 返回默认值
      return {
        tradingDelay: 0,
        apiDelay: 0,
        priceUpdateDelay: 1000,
        settlementDelay: 0,
      };
    }
  }

  /**
   * 获取托管模式设置
   */
  async getManagedMode(): Promise<boolean> {
    try {
      const setting = await this.getSetting('trading.managedMode');
      return setting.value === true || setting.value === 'true';
    } catch {
      // 如果设置不存在，返回默认值 false
      return false;
    }
  }

  /**
   * 更新托管模式设置
   */
  async updateManagedMode(enabled: boolean): Promise<void> {
    await this.updateSetting({
      key: 'trading.managedMode',
      value: enabled,
      description: '是否启用系统托管模式，启用后所有交易都将标记为托管交易',
    });
    this.logger.log(`系统托管模式已${enabled ? '启用' : '关闭'}`);
  }

  /**
   * 更新分享内容设置
   */
  async updateShareConfig(dto: UpdateShareConfigDto): Promise<void> {
    await this.updateSetting({
      key: 'share.config',
      value: dto.config,
      description: '系统分享内容配置',
    });

    this.logger.log('分享内容设置已更新');
  }

  /**
   * 获取分享内容设置
   */
  async getShareConfig() {
    try {
      const setting = await this.getSetting('share.config');
      return setting.value;
    } catch {
      // 返回默认值（保留 content 和 url 字段）
      return {
        content: '',
        url: '',
      };
    }
  }

  /**
   * 更新 IP 白名单设置
   */
  async updateIpWhitelist(dto: UpdateIpWhitelistDto): Promise<void> {
    await this.updateSetting({
      key: 'security.ipWhitelist',
      value: dto.config,
      description: 'IP 白名单配置',
    });

    this.logger.log('IP 白名单设置已更新');
  }

  /**
   * 获取 IP 白名单设置
   */
  async getIpWhitelist(): Promise<IpWhitelistConfig> {
    try {
      const setting = await this.getSetting('security.ipWhitelist');
      return setting.value as IpWhitelistConfig;
    } catch {
      // 返回默认值
      return {
        ips: [],
        enabled: false,
        description: '',
      };
    }
  }

  /**
   * 更新入金地址说明公告
   */
  async updateDepositNotice(dto: UpdateDepositNoticeDto): Promise<void> {
    await this.updateSetting({
      key: 'deposit.notice',
      value: {
        ...dto.config,
        updatedAt: new Date().toISOString(),
      },
      description: '入金地址说明公告配置',
    });

    this.logger.log('入金地址说明公告已更新');
  }

  /**
   * 获取入金地址说明公告
   */
  async getDepositNotice(): Promise<DepositNoticeConfig> {
    try {
      const setting = await this.getSetting('deposit.notice');
      return setting.value as DepositNoticeConfig;
    } catch {
      return {
        enabled: false,
        title: '',
        content: '',
      };
    }
  }

  /**
   * 从 key 提取分类
   */
  private extractCategory(key: string): string {
    const parts = key.split('.');
    return parts[0] || 'general';
  }
}

