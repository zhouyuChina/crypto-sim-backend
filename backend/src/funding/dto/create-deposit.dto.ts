import { Type } from 'class-transformer';
import { FundingNetwork } from '@prisma/client';
import { IsEnum, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export const SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDC', 'USDT'] as const;
export type DepositCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export class CreateDepositDto {
  /** 入金币种 */
  @IsString()
  @IsIn(SUPPORTED_CURRENCIES, { message: `币种必须是 ${SUPPORTED_CURRENCIES.join('/')} 之一` })
  currency!: DepositCurrency;

  /** 用户实际转入的原始币数量（例如 0.001 BTC） */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  originalAmount!: number;

  /** 前端换算后的美元金额，用于匹配地址池区间和余额入账 */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  convertedAmount!: number;

  @IsString()
  @IsEnum(FundingNetwork)
  network!: FundingNetwork;

  @IsString()
  txHash!: string;

  @IsString()
  toAddress!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
