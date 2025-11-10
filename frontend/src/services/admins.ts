import { AxiosInstance } from 'axios';
import type {
  Admin,
  PaginatedAdminsResponse,
  QueryAdminsParams,
  CreateAdminDto,
  UpdateAdminDto,
} from '@/types/admin';

export const adminService = {
  /**
   * 獲取管理員列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryAdminsParams = {},
  ): Promise<PaginatedAdminsResponse> => {
    const response = await api.get('/admin/auth/admins', { params });
    return response.data;
  },

  /**
   * 獲取單個管理員詳情
   */
  getById: async (api: AxiosInstance, id: string): Promise<Admin> => {
    const response = await api.get(`/admin/auth/admins/${id}`);
    return response.data;
  },

  /**
   * 創建管理員
   */
  create: async (
    api: AxiosInstance,
    data: CreateAdminDto,
  ): Promise<Admin> => {
    const response = await api.post('/admin/auth/admins', data);
    return response.data;
  },

  /**
   * 更新管理員信息
   */
  update: async (
    api: AxiosInstance,
    id: string,
    data: UpdateAdminDto,
  ): Promise<Admin> => {
    const response = await api.put(`/admin/auth/admins/${id}`, data);
    return response.data;
  },

  /**
   * 刪除管理員
   */
  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/admin/auth/admins/${id}`);
  },
};

