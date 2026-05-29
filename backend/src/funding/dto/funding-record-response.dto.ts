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
  currency?: string | null;
  originalAmount?: DecimalLike | number | null;
  convertedAmount?: DecimalLike | number | null;
  network: FundingNetwork | string;
  txHash?: string | null;
  toAddress?: string | null;
  editedToAddress?: string | null;
  remark?: string | null;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  reviewerName?: string | null;
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
  /** 入金币种（旧记录兜底为 USDT） */
  currency: string;
  /** 用户原始转入数量（旧记录兜底等于 amount） */
  originalAmount: number | null;
  /** 换算后美元金额（旧记录兜底等于 amount） */
  convertedAmount: number | null;
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  network: string;
  method: string;
  txHash: string | null;
  toAddress: string | null;
  editedToAddress: string | null;
  effectiveToAddress: string | null;
  remark: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  balanceApplied: boolean;
  beforeRealBalance: number | null;
  afterRealBalance: number | null;

  constructor(record: FundingRecordLike, includeUser = false) {
    const type = record.type.toLowerCase() as 'deposit' | 'withdraw';
    const amount = Number(record.amount.toString());

    this.id = record.id;
    this.type = type;
    this.amount = amount;
    // 旧记录没有 currency 字段时默认 USDT
    this.currency = record.currency ?? 'USDT';
    // 旧记录没有 originalAmount/convertedAmount 时用 amount 兜底
    this.originalAmount = record.originalAmount != null ? toNumber(record.originalAmount) : amount;
    this.convertedAmount = record.convertedAmount != null ? toNumber(record.convertedAmount) : amount;
    this.status = record.status.toLowerCase() as 'pending' | 'completed' | 'failed';
    this.date = record.createdAt;
    this.network = record.network;
    this.txHash = record.txHash ?? null;
    this.toAddress = record.toAddress ?? null;
    this.editedToAddress = record.editedToAddress ?? null;
    this.effectiveToAddress = this.editedToAddress ?? this.toAddress;
    this.remark = record.remark ?? null;
    this.reviewNote = record.reviewNote ?? null;
    this.reviewedAt = record.reviewedAt ?? null;
    this.reviewedBy = record.reviewedBy ?? null;
    this.reviewerName = record.reviewerName ?? null;
    this.balanceApplied = record.balanceApplied ?? false;
    this.beforeRealBalance = toNumber(record.beforeRealBalance);
    this.afterRealBalance = toNumber(record.afterRealBalance);
    this.method =
      type === 'deposit'
        ? `${record.network} · TXID: ${record.txHash ?? '-'}`
        : `${record.network} · Address: ${this.effectiveToAddress ?? '-'}`;

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
