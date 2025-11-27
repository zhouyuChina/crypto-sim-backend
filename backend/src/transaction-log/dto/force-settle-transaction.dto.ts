import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ForceSettleTransactionDto {
  @IsOptional()
  @IsNumber()
  exitPrice?: number;

  @IsOptional()
  @IsIn(['WIN', 'LOSE'])
  result?: 'WIN' | 'LOSE';

  @IsOptional()
  @IsString()
  reason?: string;
}
