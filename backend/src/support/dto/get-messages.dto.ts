import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesDto {
  @IsString()
  @IsOptional()  // 改为可选，如果不传则使用当前用户的对话
  conversationId?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;
}
