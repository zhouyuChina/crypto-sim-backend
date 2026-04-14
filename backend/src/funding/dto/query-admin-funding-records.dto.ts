import { IsDateString, IsOptional, IsString } from 'class-validator';

import { QueryFundingRecordsDto } from './query-funding-records.dto';

export class QueryAdminFundingRecordsDto extends QueryFundingRecordsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
