import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTradingCyclesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  tradingSessionId?: string; // 筛选指定托管会话

  @IsOptional()
  @IsEnum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

  @IsOptional()
  @IsString()
  assetType?: string; // 筛选指定资产类型
}
