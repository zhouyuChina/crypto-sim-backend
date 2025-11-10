import { AxiosInstance } from 'axios';
import type {
  Operator,
  PaginatedOperatorsResponse,
  QueryOperatorsParams,
  CreateOperatorDto,
  UpdateOperatorDto,
  OperatorTransaction,
  CreateTransactionDto,
  UpdateTransactionDto,
} from '@/types/operator';

export const operatorService = {
  /**
   * 获取操作员列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryOperatorsParams = {},
  ): Promise<PaginatedOperatorsResponse> => {
    const response = await api.get('/admin/operators', { params });
    // 后端返回的是 { data: { data: [...], pagination: {...} } }
    const { data, pagination } = response.data.data;
    return {
      data,
      ...pagination,
    };
  },

  /**
   * 获取单个操作员详情
   */
  getById: async (api: AxiosInstance, id: string): Promise<Operator> => {
    const response = await api.get(`/admin/operators/${id}`);
    return response.data.data;
  },

  /**
   * 创建操作员
   */
  create: async (
    api: AxiosInstance,
    data: CreateOperatorDto,
  ): Promise<Operator> => {
    const response = await api.post('/admin/operators', data);
    return response.data.data;
  },

  /**
   * 更新操作员信息
   */
  update: async (
    api: AxiosInstance,
    id: string,
    data: UpdateOperatorDto,
  ): Promise<Operator> => {
    const response = await api.put(`/admin/operators/${id}`, data);
    return response.data.data;
  },

  /**
   * 删除操作员
   */
  delete: async (api: AxiosInstance, id: string): Promise<void> => {
    await api.delete(`/admin/operators/${id}`);
  },

  /**
   * 获取操作员的交易流水列表
   */
  getTransactions: async (
    api: AxiosInstance,
    id: string,
    page = 1,
    pageSize = 10,
  ): Promise<{
    data: OperatorTransaction[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => {
    const response = await api.get(`/admin/operators/${id}/transactions`, {
      params: { page, pageSize },
    });
    const { data, pagination } = response.data.data;
    return {
      data,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
    };
  },

  /**
   * 为操作员创建交易流水
   */
  createTransaction: async (
    api: AxiosInstance,
    id: string,
    data: CreateTransactionDto,
  ): Promise<OperatorTransaction> => {
    const response = await api.post(`/admin/operators/${id}/transactions`, data);
    return response.data.data;
  },

  /**
   * 更新交易流水
   */
  updateTransaction: async (
    api: AxiosInstance,
    id: string,
    txId: string,
    data: UpdateTransactionDto,
  ): Promise<OperatorTransaction> => {
    const response = await api.put(`/admin/operators/${id}/transactions/${txId}`, data);
    return response.data.data;
  },

  /**
   * 删除交易流水
   */
  deleteTransaction: async (
    api: AxiosInstance,
    id: string,
    txId: string,
  ): Promise<void> => {
    await api.delete(`/admin/operators/${id}/transactions/${txId}`);
  },
};
