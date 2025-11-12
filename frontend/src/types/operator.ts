export interface Operator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  totalTransactions: number;
  totalProfit: number;
  demoAccountBalance: number; // 虛擬帳戶餘額
  realAccountBalance: number; // 真實帳戶餘額
  createdAt: string;
  updatedAt: string;
}

export interface OperatorTransaction extends import('./transaction').Transaction {
  operatorId: string;
  operatorName: string;
}

