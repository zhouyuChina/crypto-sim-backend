import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional } from 'class-validator';

export class CreateTradingSessionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string; // 被托管的用户ID

  @IsInt()
  @Min(1)
  cycleIntervalSec!: number; // 交易周期间隔（秒）

  @IsString()
  @IsNotEmpty()
  assetType!: string; // 资产类型，如 "BTC/USDT"

  @IsEnum(['DEMO', 'REAL'])
  @IsOptional()
  accountType?: 'DEMO' | 'REAL' = 'DEMO';
}
