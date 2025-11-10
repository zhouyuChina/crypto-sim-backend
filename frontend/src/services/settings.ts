import { AxiosInstance } from 'axios';
import type {
  SettingsByCategory,
  UpdateAdminAccountDto,
  UpdateTradingChannelsDto,
  UpdateCustomerServiceDto,
  UpdateLatencyDto,
  TradingChannel,
  CustomerServiceConfig,
  LatencyConfig,
  IpWhitelistConfig,
  UpdateIpWhitelistConfigDto,
} from '@/types/settings';

export const settingsService = {
  /**
   * 获取所有設置
   */
  getAll: async (
    api: AxiosInstance,
    category?: string,
  ): Promise<SettingsByCategory> => {
    const response = await api.get('/admin/settings', {
      params: category ? { category } : {},
    });
    return response.data.data;
  },

  /**
   * 获取单個設置
   */
  getOne: async (api: AxiosInstance, key: string): Promise<any> => {
    const response = await api.get(`/admin/settings/${key}`);
    return response.data.data;
  },

  /**
   * 更新管理員帳號
   */
  updateAdminAccount: async (
    api: AxiosInstance,
    data: UpdateAdminAccountDto,
  ): Promise<void> => {
    await api.put('/admin/settings/admin-account', data);
  },

  /**
   * 获取交易渠道設置
   */
  getTradingChannels: async (
    api: AxiosInstance,
  ): Promise<TradingChannel[]> => {
    const response = await api.get('/admin/settings/trading/channels');
    return response.data.data;
  },

  /**
   * 更新交易渠道設置
   */
  updateTradingChannels: async (
    api: AxiosInstance,
    data: UpdateTradingChannelsDto,
  ): Promise<void> => {
    await api.put('/admin/settings/trading/channels', data);
  },

  /**
   * 获取客服窗口設置
   */
  getCustomerService: async (
    api: AxiosInstance,
  ): Promise<CustomerServiceConfig> => {
    const response = await api.get('/admin/settings/customer-service');
    return response.data.data;
  },

  /**
   * 更新客服窗口設置
   */
  updateCustomerService: async (
    api: AxiosInstance,
    data: UpdateCustomerServiceDto,
  ): Promise<void> => {
    await api.put('/admin/settings/customer-service', data);
  },

  /**
   * 获取延遲設置
   */
  getLatency: async (api: AxiosInstance): Promise<LatencyConfig> => {
    const response = await api.get('/admin/settings/latency');
    return response.data.data;
  },

  /**
   * 更新延遲設置
   */
  updateLatency: async (
    api: AxiosInstance,
    data: UpdateLatencyDto,
  ): Promise<void> => {
    await api.put('/admin/settings/latency', data);
  },

  /**
   * 獲取IP白名單功能設置
   */
  getIpWhitelistConfig: async (
    api: AxiosInstance,
  ): Promise<IpWhitelistConfig> => {
    const response = await api.get('/admin/settings/ip-whitelist/config');
    return response.data.data;
  },

  /**
   * 更新IP白名單功能設置
   */
  updateIpWhitelistConfig: async (
    api: AxiosInstance,
    data: UpdateIpWhitelistConfigDto,
  ): Promise<void> => {
    await api.put('/admin/settings/ip-whitelist/config', data);
  },
};

