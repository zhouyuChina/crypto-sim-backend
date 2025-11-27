import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MarketSessionStatus } from '@prisma/client';

export class GetMarketSessionsDto {
  @IsOptional()
  @IsEnum(MarketSessionStatus)
  status?: MarketSessionStatus; // 过滤状态

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // 页码

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20; // 每页数量
}
