import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { appConfig } from '@/config/env';
import type { AuthTokens } from '@/types/auth';

interface ApiClientOptions {
  getTokens: () => AuthTokens | null;
  onRefresh: (tokens: AuthTokens) => void;
  onLogout: () => void;
  onForbidden?: () => void;
}

export const createApiClient = ({ getTokens, onRefresh, onLogout, onForbidden }: ApiClientOptions): AxiosInstance => {
  const instance = axios.create({
    baseURL: appConfig.apiUrl,
    withCredentials: false
  });

  instance.interceptors.request.use(config => {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  });

  let isRefreshing = false;
  let refreshQueue: Array<(token: string | null) => void> = [];

  const processQueue = (token: string | null) => {
    refreshQueue.forEach(resolve => resolve(token));
    refreshQueue = [];
  };

  instance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      // Handle 403 Forbidden (token expired)
      if (error.response?.status === 403 && onForbidden) {
        onForbidden();
        return Promise.reject(error);
      }

      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push(token => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(instance(originalRequest));
            } else {
              resolve(Promise.reject(error));
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = getTokens();
        if (!tokens?.refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${appConfig.apiUrl}/auth/refresh`,
          { refreshToken: tokens.refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        onRefresh(response.data as AuthTokens);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        }
        processQueue(response.data.accessToken);
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(null);
        onLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return instance;
};
