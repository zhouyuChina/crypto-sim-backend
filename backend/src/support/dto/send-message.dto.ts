import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsEnum(MessageType)
  messageType!: MessageType;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
