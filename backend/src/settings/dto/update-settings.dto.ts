import { IsString, IsNotEmpty, ValidateNested, IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsObject()
  @IsNotEmpty()
  value!: any; // JSON 值

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSettingsBatchDto {
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingDto)
  settings!: UpdateSettingDto[];
}

// 管理员账号设置
export class UpdateAdminAccountDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}

// 交易渠道设置
export interface TradingChannel {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  config?: Record<string, any>;
}

export class UpdateTradingChannelsDto {
  channels!: TradingChannel[];
}

// 客服窗口设置
export interface CustomerServiceConfig {
  enabled: boolean;
  email?: string; // 客服邮箱地址
  provider?: string; // 如 "custom", "tawk", "intercom"
  scriptUrl?: string;
  widgetId?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark';
  welcomeMessage?: string;
}

export class UpdateCustomerServiceDto {
  @IsObject()
  config!: CustomerServiceConfig;
}

// 延迟设置
export interface LatencyConfig {
  // 交易延迟（毫秒）
  tradingDelay: number;
  // API 调用延迟（毫秒）
  apiDelay: number;
  // 价格更新延迟（毫秒）
  priceUpdateDelay: number;
  // 结算延迟（毫秒）
  settlementDelay: number;
}

export class UpdateLatencyDto {
  @IsObject()
  config!: LatencyConfig;
}

// 分享内容设置
export interface ShareConfig {
  title?: string;           // 分享标题
  description?: string;     // 分享描述
  image?: string;          // 分享图片 URL
  url?: string;            // 分享链接
  hashtags?: string[];     // 话题标签
  content?: string;        // 分享平台文案（支持多行，保留换行格式）
}

export class UpdateShareConfigDto {
  @IsObject()
  config!: ShareConfig;
}

// 入金地址设置
export interface DepositAddressConfig {
  address: string;       // 入金地址（字符串）
  qrCodeUrl: string;     // 二维码图片 URL
}

export class UpdateDepositAddressDto {
  @IsObject()
  config!: DepositAddressConfig;
}

// IP 白名单设置
export interface IpWhitelistConfig {
  ips: string[];         // IP 地址列表（支持单个 IP 或 CIDR 格式，如 "192.168.1.1" 或 "192.168.1.0/24"）
  enabled: boolean;      // 是否启用 IP 白名单
  description?: string;  // 白名单描述
}

export class UpdateIpWhitelistDto {
  @IsObject()
  config!: IpWhitelistConfig;
}

