import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDepositDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsString()
  network!: string;

  @IsString()
  txHash!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
