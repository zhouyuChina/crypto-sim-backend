import { AxiosInstance } from 'axios';
import type {
  Transaction,
  PaginatedTransactionsResponse,
  QueryTransactionsParams,
  SettleTransactionDto,
} from '@/types/transaction';

export const transactionService = {
  /**
   * 获取交易列表
   */
  list: async (
    api: AxiosInstance,
    params: QueryTransactionsParams = {},
  ): Promise<PaginatedTransactionsResponse> => {
    const response = await api.get('/admin/transactions', { params });
    return response.data.data;
  },

  /**
   * 根據訂單号获取交易详情
   */
  getByOrderNumber: async (
    api: AxiosInstance,
    orderNumber: string,
  ): Promise<Transaction> => {
    const response = await api.get(`/transactions/${orderNumber}`);
    return response.data.data;
  },

  /**
   * 結算交易
   */
  settle: async (
    api: AxiosInstance,
    orderNumber: string,
    data: SettleTransactionDto,
  ): Promise<Transaction> => {
    const response = await api.post(`/transactions/${orderNumber}/settle`, data);
    return response.data.data;
  },

  /**
   * 取消交易
   */
  cancel: async (api: AxiosInstance, orderNumber: string): Promise<Transaction> => {
    const response = await api.post(`/transactions/${orderNumber}/cancel`);
    return response.data.data;
  },

  /**
   * 获取用戶统计數據
   */
  getStatistics: async (api: AxiosInstance) => {
    const response = await api.get('/transactions/statistics');
    return response.data.data;
  },
};
