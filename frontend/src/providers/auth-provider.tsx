import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type PropsWithChildren
} from 'react';
import axios from 'axios';

import { createApiClient } from '@/lib/api-client';
import { storage } from '@/utils/storage';
import { appConfig } from '@/config/env';
import type { AuthTokens, AuthResponse, User } from '@/types/auth';
import { useToastContext } from './toast-provider';

interface AuthContextValue {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  api: ReturnType<typeof createApiClient>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  // 將簡體中文轉換為繁體的輔助函數
  const convertToTraditional = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/系统管理员/g, '系統管理員')
      .replace(/系统/g, '系統')
      .replace(/管理员/g, '管理員');
  };

  // 轉換用戶數據中的角色名稱和顯示名稱
  const convertUserRoles = (user: User | null): User | null => {
    if (!user) return user;
    const convertedUser = { ...user };
    
    // 轉換 displayName
    if (convertedUser.displayName) {
      convertedUser.displayName = convertToTraditional(convertedUser.displayName);
    }
    
    // 轉換 roles
    if (convertedUser.roles) {
      convertedUser.roles = convertedUser.roles.map(role => convertToTraditional(role));
    }
    
    // 轉換 permissions
    if (convertedUser.permissions) {
      convertedUser.permissions = convertedUser.permissions.map(perm => convertToTraditional(perm));
    }
    
    return convertedUser;
  };

  // 初始化時轉換已儲存的用戶數據
  const initialUser = convertUserRoles(storage.getUser());
  const [user, setUser] = useState<User | null>(initialUser);
  const [tokens, setTokens] = useState<AuthTokens | null>(() => storage.getTokens());
  const [loading, setLoading] = useState(false);
  const [forbiddenHandled, setForbiddenHandled] = useState(false);

  const { toast } = useToastContext();

  const handleLogout = useCallback(() => {
    setUser(null);
    setTokens(null);
    storage.clearTokens();
    storage.clearUser();
    // Navigate to login page
    window.location.href = '/login';
  }, []);

  const handleForbidden = useCallback(() => {
    // Prevent multiple calls
    if (forbiddenHandled) {
      return;
    }
    setForbiddenHandled(true);

    // Show toast notification
    toast({
      description: '連線逾時，為保障安全起見請重新登入',
      variant: 'destructive'
    });

    // Logout after 5 seconds
    setTimeout(() => {
      handleLogout();
    }, 5000);
  }, [toast, handleLogout, forbiddenHandled]);

  const api = useMemo(
    () =>
      createApiClient({
        getTokens: () => tokens,
        onRefresh: newTokens => {
          setTokens(newTokens);
          storage.saveTokens(newTokens);
        },
        onLogout: handleLogout,
        onForbidden: handleForbidden
      }),
    [handleLogout, handleForbidden, tokens]
  );

  useEffect(() => {
    if (user) {
      storage.saveUser(user);
    } else {
      storage.clearUser();
    }
  }, [user]);

  useEffect(() => {
    if (tokens) {
      storage.saveTokens(tokens);
    } else {
      storage.clearTokens();
    }
  }, [tokens]);


  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        const response = await axios.post<{ data: AuthResponse }>(
          `${appConfig.apiUrl}/admin/auth/login`,
          { username, password },
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Backend wraps response in { data: ... }
        const authData = response.data.data;
        let userData = authData.user || authData.admin || null;
        // 轉換角色名稱
        userData = convertUserRoles(userData);
        setUser(userData);
        setTokens(authData.tokens);
        if (userData) {
          storage.saveUser(userData);
        }
        storage.saveTokens(authData.tokens);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload: { email: string; password: string; displayName: string }) => {
      setLoading(true);
      try {
        const response = await axios.post<{ data: AuthResponse }>(
          `${appConfig.apiUrl}/auth/register`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );

        // Backend wraps response in { data: ... }
        const authData = response.data.data;
        const userData = authData.user || null;
        setUser(userData);
        setTokens(authData.tokens);
        if (userData) {
          storage.saveUser(userData);
        }
        storage.saveTokens(authData.tokens);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch (error) {
      console.warn('Failed to logout cleanly', error);
    } finally {
      handleLogout();
    }
  }, [api, handleLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tokens,
      loading,
      isAuthenticated: Boolean(user && tokens?.accessToken),
      login,
      register,
      logout,
      api
    }),
    [api, loading, login, logout, register, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
