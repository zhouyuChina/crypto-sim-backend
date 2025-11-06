import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTradingSessionsDto {
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
  userId?: string; // 筛选指定用户

  @IsOptional()
  @IsEnum(['ACTIVE', 'STOPPED', 'PAUSED'])
  status?: 'ACTIVE' | 'STOPPED' | 'PAUSED';

  @IsOptional()
  @IsString()
  assetType?: string; // 筛选指定资产类型

  @IsOptional()
  @IsEnum(['DEMO', 'REAL'])
  accountType?: 'DEMO' | 'REAL';
}
