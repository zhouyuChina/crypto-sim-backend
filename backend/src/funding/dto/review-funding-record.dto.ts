import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewFundingRecordDto {
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  applyBalance?: boolean;
}
