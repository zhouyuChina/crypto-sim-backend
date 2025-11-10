import type { AuthTokens, User } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'crypto-sim.accessToken';
const REFRESH_TOKEN_KEY = 'crypto-sim.refreshToken';
const USER_KEY = 'crypto-sim.user';

export const storage = {
  saveTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  getTokens(): AuthTokens | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  },
  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  saveUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  clearUser() {
    localStorage.removeItem(USER_KEY);
  }
};
