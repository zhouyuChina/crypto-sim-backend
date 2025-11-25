import { IsEnum, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export enum BalanceType {
  DEMO = 'demo',
  REAL = 'real',
}

export enum AdjustmentType {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set',
}

export class AdjustBalanceDto {
  @IsEnum(BalanceType)
  balanceType!: BalanceType;

  @IsEnum(AdjustmentType)
  adjustmentType!: AdjustmentType;

  @IsNumber()
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
