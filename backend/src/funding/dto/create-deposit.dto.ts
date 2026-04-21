import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDepositDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsString()
  network!: string;

  /** 用户实际转入所使用的平台收款地址（TRC20） */
  @IsString()
  toAddress!: string;

  @IsString()
  txHash!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
