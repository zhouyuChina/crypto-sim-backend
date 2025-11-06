export type TradeDirection = 'CALL' | 'PUT';
export type TransactionStatus = 'PENDING' | 'SETTLED' | 'CANCELED';
export type AccountType = 'DEMO' | 'REAL';

export interface Transaction {
  id: string;
  userId: string;
  userName?: string;  // 用戶名
  orderNumber: string;
  accountType: AccountType;
  assetType: string;
  direction: TradeDirection;
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
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  isManaged?: boolean; // 是否在托管狀態下产生的交易
}

export interface PaginatedTransactionsResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface QueryTransactionsParams {
  page?: number;
  limit?: number;
  assetType?: string;
  direction?: TradeDirection;
  status?: TransactionStatus;
  accountType?: AccountType;
  username?: string;
  managedMode?: boolean;
}

export interface SettleTransactionDto {
  exitPrice: number;
}
