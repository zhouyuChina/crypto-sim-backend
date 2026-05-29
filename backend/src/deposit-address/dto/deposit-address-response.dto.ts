import { DepositAddress, DepositAddressRisk, FundingNetwork, Prisma } from '@prisma/client';

export class DepositAddressResponseDto {
  id: string;
  network: FundingNetwork;
  address: string;
  qrCodeUrl: string;
  minAmount: string;
  maxAmount: string | null;
  capacity: string | null;
  usedAmount: string;
  pendingAmount: string;
  remainingAmount: string | null; // null = capacity 无上限
  enabled: boolean;
  riskStatus: DepositAddressRisk;
  lastRiskCheckAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(record: DepositAddress) {
    this.id = record.id;
    this.network = record.network;
    this.address = record.address;
    this.qrCodeUrl = record.qrCodeUrl;
    this.minAmount = record.minAmount.toString();
    this.maxAmount = record.maxAmount ? record.maxAmount.toString() : null;
    this.capacity = record.capacity ? record.capacity.toString() : null;
    this.usedAmount = record.usedAmount.toString();
    this.pendingAmount = record.pendingAmount.toString();
    this.remainingAmount = record.capacity
      ? new Prisma.Decimal(record.capacity)
          .sub(record.usedAmount)
          .sub(record.pendingAmount)
          .toString()
      : null;
    this.enabled = record.enabled;
    this.riskStatus = record.riskStatus;
    this.lastRiskCheckAt = record.lastRiskCheckAt;
    this.sortOrder = record.sortOrder;
    this.createdAt = record.createdAt;
    this.updatedAt = record.updatedAt;
  }
}
