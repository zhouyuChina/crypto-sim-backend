export interface Operator {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string;
  isActive: boolean;
  isCustomMember?: boolean;
  accountBalance: number;
  demoBalance: number;
  realBalance: number;
  totalProfitLoss: number;
  totalTrades: number;
  winRate: number;
  verificationStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PaginatedOperatorsResponse {
  data: Operator[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryOperatorsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  verificationStatus?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  sortBy?: 'createdAt' | 'updatedAt' | 'displayName' | 'totalProfitLoss' | 'demoBalance' | 'realBalance' | 'email';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface CreateOperatorDto {
  email: string;
  displayName: string;
  phoneNumber: string;
  avatar?: string;
  demoBalance?: number;
  realBalance?: number;
  verificationStatus?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
}

export interface UpdateOperatorDto {
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  avatar?: string;
  demoBalance?: number;
  realBalance?: number;
  verificationStatus?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  isActive?: boolean;
}

export interface OperatorTransaction {
  id: string;
  userId: string;
  userName?: string;
  orderNumber: string;
  assetType: string;
  direction: 'CALL' | 'PUT';
  entryTime: string;
  expiryTime: string;
  duration: number;
  entryPrice: number;
  currentPrice: number | null;
  exitPrice: number | null;
  spread: number;
  investAmount: number;
  returnRate: number;
  actualReturn: number;
  status: 'PENDING' | 'SETTLED' | 'CANCELED';
  accountType: 'DEMO' | 'REAL';
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  operatorId?: string;
}

export interface CreateTransactionDto {
  assetType: string;
  direction: 'CALL' | 'PUT';
  entryTime: string;
  expiryTime: string;
  duration: number;
  entryPrice: number;
  exitPrice?: number;
  spread: number;
  investAmount: number;
  returnRate: number;
  actualReturn: number;
  status?: 'PENDING' | 'SETTLED' | 'CANCELED';
  accountType?: 'DEMO' | 'REAL';
}

export interface UpdateTransactionDto {
  assetType?: string;
  direction?: 'CALL' | 'PUT';
  entryTime?: string;
  expiryTime?: string;
  duration?: number;
  entryPrice?: number;
  exitPrice?: number | null;
  spread?: number;
  investAmount?: number;
  returnRate?: number;
  actualReturn?: number;
  status?: 'PENDING' | 'SETTLED' | 'CANCELED';
  accountType?: 'DEMO' | 'REAL';
}
