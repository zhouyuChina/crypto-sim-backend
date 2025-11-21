import { TradeDirection, TransactionStatus, AccountType } from '@prisma/client';

export class TransactionResponseDto {
  id!: string;
  userId!: string;
  userName?: string;  // 用户名
  orderNumber!: string;
  accountType!: AccountType;
  assetType!: string;
  direction!: TradeDirection;
  entryTime!: Date;
  expiryTime!: Date;
  duration!: number;
  entryPrice!: number;
  currentPrice!: number | null;
  exitPrice!: number | null;
  spread!: number;
  investAmount!: number;
  returnRate!: number;
  actualReturn!: number;
  status!: TransactionStatus;
  createdAt!: Date;
  updatedAt!: Date;
  settledAt!: Date | null;
  isManaged!: boolean; // 是否在托管状态下产生的交易
  marketSessionId!: string | null; // 关联的大盘 ID
  marketSessionName!: string | null; // 关联的大盘名称
}
