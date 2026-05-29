import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

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
  network!: string;

  @IsString()
  txHash!: string;

  @IsString()
  @Matches(/^T[1-9A-HJ-NP-Za-km-z]{33}$/, { message: '入金地址格式错误' })
  toAddress!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
