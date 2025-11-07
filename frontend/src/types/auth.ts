export interface User {
  id: string;
  email: string;
  displayName: string;
  username?: string; // 管理員有 username 字段
  roles?: string[]; // 普通用戶有 roles
  permissions?: string[]; // 管理員有 permissions
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user?: User; // 普通用戶登入返回 user
  admin?: User; // 管理員登入返回 admin
  tokens: AuthTokens;
}
