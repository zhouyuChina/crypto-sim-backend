import { IsEnum, IsNumber, IsPositive, IsString, IsOptional, Min, Max, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TradeDirection, AccountType, TransactionStatus } from '@prisma/client';

export class AdminCreateTransactionDto {
  @IsString()
  userId!: string; // 用户ID

  @IsString()
  assetType!: string; // 资产类型，如 BTC, ETH

  @IsEnum(TradeDirection)
  direction!: TradeDirection; // CALL=买涨, PUT=买跌

  @IsNumber()
  @IsPositive()
  duration!: number; // 时长（秒）

  @IsNumber()
  @IsPositive()
  entryPrice!: number; // 入场价格

  @IsNumber()
  @IsPositive()
  investAmount!: number; // 投入金额

  @IsNumber()
  @Min(0)
  @Max(10)
  returnRate!: number; // 报酬率，如 0.85 表示 85%

  @IsEnum(AccountType)
  @IsOptional()
  accountType?: AccountType; // 账户类型 (DEMO=虚拟, REAL=真实)，默认 DEMO

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  entryTime?: Date; // 可选：自定义入场时间，默认当前时间

  @IsOptional()
  @IsNumber()
  @IsPositive()
  exitPrice?: number; // 可选：出场价格，如果提供则创建已结算的交易

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus; // 可选：交易状态，默认 PENDING

  @IsOptional()
  @IsBoolean()
  autoSettle?: boolean; // 可选：是否自动结算（如果提供了 exitPrice），默认 true

  @IsOptional()
  @IsString()
  reason?: string; // 可选：创建原因（用于审计）
}
