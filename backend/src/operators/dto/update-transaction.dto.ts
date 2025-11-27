import { IsString, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class UpdateTransactionDto {
  @IsString()
  @IsOptional()
  assetType?: string;

  @IsEnum(['CALL', 'PUT'])
  @IsOptional()
  direction?: 'CALL' | 'PUT';

  @IsDateString()
  @IsOptional()
  entryTime?: string;

  @IsDateString()
  @IsOptional()
  expiryTime?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsNumber()
  @IsOptional()
  entryPrice?: number;

  @IsNumber()
  @IsOptional()
  exitPrice?: number;

  @IsNumber()
  @IsOptional()
  spread?: number;

  @IsNumber()
  @IsOptional()
  investAmount?: number;

  @IsNumber()
  @IsOptional()
  returnRate?: number;

  @IsNumber()
  @IsOptional()
  actualReturn?: number;

  @IsEnum(['PENDING', 'SETTLED', 'CANCELED'])
  @IsOptional()
  status?: 'PENDING' | 'SETTLED' | 'CANCELED';

  @IsEnum(['DEMO', 'REAL'])
  @IsOptional()
  accountType?: 'DEMO' | 'REAL';

  @IsString()
  @IsOptional()
  subMarketCycleId?: string;
}
