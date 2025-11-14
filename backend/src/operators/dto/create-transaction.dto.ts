import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  assetType!: string; // 资产类型，如 "BTC/USDT"

  @IsEnum(['CALL', 'PUT'])
  @IsNotEmpty()
  direction!: 'CALL' | 'PUT'; // 交易方向

  @IsDateString()
  @IsNotEmpty()
  entryTime!: string; // 进场时间

  @IsDateString()
  @IsNotEmpty()
  expiryTime!: string; // 到期时间

  @IsNumber()
  @IsNotEmpty()
  duration!: number; // 持续时间（秒）

  @IsNumber()
  @IsNotEmpty()
  entryPrice!: number; // 进场价格

  @IsNumber()
  @IsOptional()
  exitPrice?: number; // 出场价格

  @IsNumber()
  @IsNotEmpty()
  spread!: number; // 点差

  @IsNumber()
  @IsNotEmpty()
  investAmount!: number; // 投资金额

  @IsNumber()
  @IsNotEmpty()
  returnRate!: number; // 回报率

  @IsNumber()
  @IsNotEmpty()
  actualReturn!: number; // 实际回报

  @IsEnum(['PENDING', 'SETTLED', 'CANCELED'])
  @IsOptional()
  status?: 'PENDING' | 'SETTLED' | 'CANCELED' = 'SETTLED';

  @IsEnum(['DEMO', 'REAL'])
  @IsOptional()
  accountType?: 'DEMO' | 'REAL' = 'DEMO';

  @IsString()
  @IsOptional()
  subMarketCycleId?: string;
}
