export interface Setting {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsByCategory {
  admin?: Setting[];
  trading?: Setting[];
  customer_service?: Setting[];
  latency?: Setting[];
  [key: string]: Setting[] | undefined;
}

// 管理員帳號設置
export interface UpdateAdminAccountDto {
  username: string;
  password: string;
  displayName?: string;
}

// 交易渠道設置
export interface TradingChannel {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  config?: Record<string, any>;
}

export interface UpdateTradingChannelsDto {
  channels: TradingChannel[];
}

// 客服窗口設置
export interface CustomerServiceConfig {
  enabled: boolean;
  provider?: string; // 如 "custom", "tawk", "intercom"
  scriptUrl?: string;
  widgetId?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark';
  welcomeMessage?: string;
}

export interface UpdateCustomerServiceDto {
  config: CustomerServiceConfig;
}

// 延遲設置
export interface LatencyConfig {
  userDataDelay: number; // 用戶數據延遲（秒）
}

export interface UpdateLatencyDto {
  config: LatencyConfig;
}

// IP白名單
export interface IpWhitelist {
  id: string;
  ipAddress: string; // IP地址或CIDR格式（如：192.168.1.1 或 192.168.1.0/24）
  description?: string; // 描述/備註
  isActive: boolean; // 是否啟用
  createdAt: string;
  updatedAt: string;
}

export interface CreateIpWhitelistDto {
  ipAddress: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateIpWhitelistDto {
  ipAddress?: string;
  description?: string;
  isActive?: boolean;
}

export interface IpWhitelistConfig {
  enabled: boolean; // 是否啟用IP白名單功能
}

export interface UpdateIpWhitelistConfigDto {
  config: IpWhitelistConfig;
}

