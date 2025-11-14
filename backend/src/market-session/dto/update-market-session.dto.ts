import { IsString, IsOptional, IsDateString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MarketResult } from '@prisma/client';
import { TradeTypeRuleDto } from './trade-type-rule.dto';

export class UpdateMarketSessionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsEnum(MarketResult)
  initialResult?: MarketResult;

  @IsOptional()
  @IsEnum(MarketResult)
  actualResult?: MarketResult; // 实际结算结果

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeTypeRuleDto)
  tradeTypes?: TradeTypeRuleDto[];

  @IsOptional()
  @IsString()
  assetType?: string;
}
