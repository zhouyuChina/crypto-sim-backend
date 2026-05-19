import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class CreateDepositDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

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
