import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

import { QueryTransactionsDto } from './query-transactions.dto';

export class AdminQueryTransactionsDto extends QueryTransactionsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  username?: string;  // 通过用户名查询

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  managedMode?: boolean;  // 通过托管模式查询

  @IsOptional()
  @IsString()
  marketSessionId?: string;  // 通过大盘 ID 查询
}
