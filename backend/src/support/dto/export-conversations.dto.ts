import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ConversationStatus } from '@prisma/client';

export class ExportConversationsDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string; // 开始日期

  @IsOptional()
  @IsDateString()
  endDate?: string; // 结束日期

  @IsOptional()
  userId?: string; // 特定用户

  @IsOptional()
  adminId?: string; // 特定管理员

  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: 'json' | 'csv'; // 导出格式
}
