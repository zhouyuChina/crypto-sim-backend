import { FundingNetwork } from '@prisma/client';

type DecimalLike = {
  toString(): string;
};

type FundingRecordLike = {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: DecimalLike | number;
  network: FundingNetwork | string;
  txHash?: string | null;
  toAddress?: string | null;
  remark?: string | null;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  balanceApplied?: boolean;
  beforeRealBalance?: DecimalLike | number | null;
  afterRealBalance?: DecimalLike | number | null;
  createdAt: Date;
  user?: {
    displayName?: string | null;
  } | null;
};

const toNumber = (value: DecimalLike | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value.toString());
};

export class FundingRecordResponseDto {
  id: string;
  userId?: string;
  userName?: string | null;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  network: string;
  method: string;
  txHash: string | null;
  toAddress: string | null;
  remark: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  balanceApplied: boolean;
  beforeRealBalance: number | null;
  afterRealBalance: number | null;

  constructor(record: FundingRecordLike, includeUser = false) {
    const type = record.type.toLowerCase() as 'deposit' | 'withdraw';

    this.id = record.id;
    this.type = type;
    this.amount = Number(record.amount.toString());
    this.status = record.status.toLowerCase() as 'pending' | 'completed' | 'failed';
    this.date = record.createdAt;
    this.network = record.network;
    this.txHash = record.txHash ?? null;
    this.toAddress = record.toAddress ?? null;
    this.remark = record.remark ?? null;
    this.reviewNote = record.reviewNote ?? null;
    this.reviewedAt = record.reviewedAt ?? null;
    this.reviewedBy = record.reviewedBy ?? null;
    this.balanceApplied = record.balanceApplied ?? false;
    this.beforeRealBalance = toNumber(record.beforeRealBalance);
    this.afterRealBalance = toNumber(record.afterRealBalance);
    this.method =
      type === 'deposit'
        ? `${record.network} · TXID: ${record.txHash ?? '-'}`
        : `${record.network} · Address: ${record.toAddress ?? '-'}`;

    if (includeUser) {
      this.userId = record.userId;
      this.userName = record.user?.displayName ?? null;
    }
  }
}

export class PaginatedFundingRecordsResponseDto {
  data: FundingRecordResponseDto[];
  total: number;
  page: number;
  limit: number;

  constructor(records: FundingRecordLike[], total: number, page: number, limit: number, includeUser = false) {
    this.data = records.map(record => new FundingRecordResponseDto(record, includeUser));
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}
