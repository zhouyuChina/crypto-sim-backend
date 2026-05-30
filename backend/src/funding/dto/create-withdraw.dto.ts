import { Type } from 'class-transformer';
import { FundingNetwork } from '@prisma/client';
import { IsEnum, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export const WITHDRAW_SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDC', 'USDT'] as const;
export type WithdrawCurrency = (typeof WITHDRAW_SUPPORTED_CURRENCIES)[number];

export class CreateWithdrawDto {
  @IsString()
  @IsIn(WITHDRAW_SUPPORTED_CURRENCIES, {
    message: `币种必须是 ${WITHDRAW_SUPPORTED_CURRENCIES.join('/')} 之一`,
  })
  currency!: WithdrawCurrency;

  /** 用户实际提出的原始币数量（例如 0.001 BTC） */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  originalAmount!: number;

  /** 前端换算后的美元金额，用于余额校验和扣款 */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  convertedAmount!: number;

  @IsString()
  @IsEnum(FundingNetwork)
  network!: FundingNetwork;

  @IsString()
  toAddress!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
