import { IsString, IsOptional, IsDateString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MarketResult } from '@prisma/client';
import { TradeTypeRuleDto } from './trade-type-rule.dto';

export class CreateMarketSessionDto {
  @IsString()
  name!: string; // 开盘名称

  @IsOptional()
  @IsString()
  description?: string; // 描述

  @IsDateString()
  startTime!: string; // 开盘开始时间

  @IsDateString()
  endTime!: string; // 开盘结束时间

  @IsEnum(MarketResult)
  @IsOptional()
  initialResult?: MarketResult; // 初始输赢状态，默认 PENDING

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeTypeRuleDto)
  tradeTypes?: TradeTypeRuleDto[]; // 支持的交易类型配置

  @IsOptional()
  @IsString()
  assetType?: string; // 资产类型
}
