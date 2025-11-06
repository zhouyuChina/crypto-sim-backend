import { AxiosInstance } from 'axios';
import type {
  IpWhitelist,
  CreateIpWhitelistDto,
  UpdateIpWhitelistDto,
} from '@/types/settings';

export interface PaginatedIpWhitelistResponse {
  data: IpWhitelist[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryIpWhitelistParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export const ipWhitelistService = {
  /**
   * 獲取IP白名單列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryIpWhitelistParams = {},
  ): Promise<PaginatedIpWhitelistResponse> => {
    const response = await api.get('/admin/settings/ip-whitelist', { params });
    return response.data.data;
  },

  /**
   * 獲取單個IP白名單詳情
   */
  getById: async (api: AxiosInstance, id: string): Promise<IpWhitelist> => {
    const response = await api.get(`/admin/settings/ip-whitelist/${id}`);
    return response.data.data;
  },

  /**
   * 創建IP白名單
   */
  create: async (
    api: AxiosInstance,
    data: CreateIpWhitelistDto,
  ): Promise<IpWhitelist> => {
    const response = await api.post('/admin/settings/ip-whitelist', data);
    return response.data.data;
  },

  /**
   * 更新IP白名單
   */
  update: async (
    api: AxiosInstance,
    id: string,
    data: UpdateIpWhitelistDto,
  ): Promise<IpWhitelist> => {
    const response = await api.put(`/admin/settings/ip-whitelist/${id}`, data);
    return response.data.data;
  },

  /**
   * 刪除IP白名單
   */
  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/admin/settings/ip-whitelist/${id}`);
  },
};

