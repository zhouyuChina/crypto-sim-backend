import type { AxiosInstance } from 'axios';

import type {
  Testimonial,
  TestimonialPayload,
  CarouselItem,
  CarouselPayload,
  LeaderboardEntry,
  LeaderboardPayload,
  LeaderboardType,
  TradingPerformanceEntry,
  TradingPerformancePayload,
  ShareCopyPayload,
  ShareCopySetting,
  DepositAddressPayload,
  DepositAddressSetting
} from '@/types/cms';

export const cmsService = {
  async listTestimonials(api: AxiosInstance): Promise<Testimonial[]> {
    const response = await api.get<{ data: Testimonial[] }>('/admin/cms/testimonials');
    return response.data.data;
  },

  async createTestimonial(api: AxiosInstance, payload: TestimonialPayload): Promise<Testimonial> {
    const response = await api.post<{ data: Testimonial }>('/admin/cms/testimonials', payload);
    return response.data.data;
  },

  async updateTestimonial(
    api: AxiosInstance,
    id: string,
    payload: TestimonialPayload
  ): Promise<Testimonial> {
    const response = await api.put<{ data: Testimonial }>(`/admin/cms/testimonials/${id}`, payload);
    return response.data.data;
  },

  async deleteTestimonial(api: AxiosInstance, id: string): Promise<void> {
    await api.delete(`/admin/cms/testimonials/${id}`);
  },

  async listCarousels(api: AxiosInstance): Promise<CarouselItem[]> {
    const response = await api.get<{ data: CarouselItem[] }>('/admin/cms/carousels');
    return response.data.data;
  },

  async createCarousel(api: AxiosInstance, payload: CarouselPayload): Promise<CarouselItem> {
    const response = await api.post<{ data: CarouselItem }>('/admin/cms/carousels', payload);
    return response.data.data;
  },

  async updateCarousel(
    api: AxiosInstance,
    id: string,
    payload: CarouselPayload
  ): Promise<CarouselItem> {
    const response = await api.put<{ data: CarouselItem }>(`/admin/cms/carousels/${id}`, payload);
    return response.data.data;
  },

  async deleteCarousel(api: AxiosInstance, id: string): Promise<void> {
    await api.delete(`/admin/cms/carousels/${id}`);
  },

  async listLeaderboard(api: AxiosInstance, type?: LeaderboardType): Promise<LeaderboardEntry[]> {
    const response = await api.get<{ data: LeaderboardEntry[] }>('/admin/cms/leaderboard', {
      params: type ? { type } : undefined
    });
    return response.data.data;
  },

  async createLeaderboard(
    api: AxiosInstance,
    payload: LeaderboardPayload
  ): Promise<LeaderboardEntry> {
    const response = await api.post<{ data: LeaderboardEntry }>('/admin/cms/leaderboard', payload);
    return response.data.data;
  },

  async updateLeaderboard(
    api: AxiosInstance,
    id: string,
    payload: LeaderboardPayload
  ): Promise<LeaderboardEntry> {
    const response = await api.put<{ data: LeaderboardEntry }>(`/admin/cms/leaderboard/${id}`, payload);
    return response.data.data;
  },

  async deleteLeaderboard(api: AxiosInstance, id: string): Promise<void> {
    await api.delete(`/admin/cms/leaderboard/${id}`);
  },

  async listTradingPerformance(api: AxiosInstance): Promise<TradingPerformanceEntry[]> {
    const response = await api.get<{ data: TradingPerformanceEntry[] }>(
      '/admin/cms/trading-performance'
    );
    return response.data.data;
  },

  async createTradingPerformance(
    api: AxiosInstance,
    payload: TradingPerformancePayload
  ): Promise<TradingPerformanceEntry> {
    const response = await api.post<{ data: TradingPerformanceEntry }>(
      '/admin/cms/trading-performance',
      payload
    );
    return response.data.data;
  },

  async updateTradingPerformance(
    api: AxiosInstance,
    id: string,
    payload: TradingPerformancePayload
  ): Promise<TradingPerformanceEntry> {
    const response = await api.put<{ data: TradingPerformanceEntry }>(
      `/admin/cms/trading-performance/${id}`,
      payload
    );
    return response.data.data;
  },

  async deleteTradingPerformance(api: AxiosInstance, id: string): Promise<void> {
    await api.delete(`/admin/cms/trading-performance/${id}`);
  },

  async getShareCopy(api: AxiosInstance): Promise<ShareCopySetting | null> {
    const response = await api.get<{ data: ShareCopySetting | null }>('/admin/cms/share-copy');
    return response.data.data ?? null;
  },

  async updateShareCopy(
    api: AxiosInstance,
    payload: ShareCopyPayload
  ): Promise<ShareCopySetting> {
    const response = await api.put<{ data: ShareCopySetting }>('/admin/cms/share-copy', payload);
    return response.data.data;
  },

  async getDepositAddress(api: AxiosInstance): Promise<DepositAddressSetting | null> {
    const response = await api.get<{ data: DepositAddressSetting | null }>(
      '/admin/cms/deposit-address'
    );
    return response.data.data ?? null;
  },

  async updateDepositAddress(
    api: AxiosInstance,
    payload: DepositAddressPayload
  ): Promise<DepositAddressSetting> {
    const response = await api.put<{ data: DepositAddressSetting }>(
      '/admin/cms/deposit-address',
      payload
    );
    return response.data.data;
  }
};
