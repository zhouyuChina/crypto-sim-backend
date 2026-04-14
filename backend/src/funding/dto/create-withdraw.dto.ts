import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWithdrawDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsString()
  network!: string;

  @IsString()
  toAddress!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
