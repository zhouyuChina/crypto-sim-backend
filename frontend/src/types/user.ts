export interface User {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;  // 暂时不顯示，但保留字段以备后用
  avatar?: string;
  idCardFront?: string;  // 身份證正面照片 URL
  idCardBack?: string;   // 身份證反面照片 URL
  roles: string[];
  isActive: boolean;
  verificationStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  lastLoginAt: string | null;
  lastLoginIp: string | null;  // 最後登入IP地址
  createdAt: string;
  updatedAt: string;
  demoBalance: string;
  realBalance: string;
  totalProfitLoss: string;
  totalTrades: number;
  winRate: string;
}

export interface PaginatedUsersResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  verificationStatus?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'displayName' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  displayName?: string;
  phoneNumber?: string;  // 暂时不更新，但保留字段以备后用
  avatar?: string;
  isActive?: boolean;
  verificationStatus?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
}

export interface UpdateUserRolesDto {
  roles: string[];
}

export interface AdjustBalanceDto {
  balanceType: 'demo' | 'real';
  adjustmentType: 'add' | 'subtract' | 'set';
  amount: number;
  reason?: string;
}
