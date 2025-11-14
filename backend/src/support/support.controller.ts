import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { GetMessagesDto } from './dto/get-messages.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * 获取或创建用户的对话
   * GET /api/support/conversation
   */
  @Get('conversation')
  async getConversation(@CurrentUser() user: any) {
    return await this.supportService.getOrCreateUserConversation(user.id, user.displayName);
  }

  /**
   * 获取消息历史
   * GET /api/support/messages
   */
  @Get('messages')
  async getMessages(@CurrentUser() user: any, @Query() dto: GetMessagesDto) {
    return await this.supportService.getMessages(dto.conversationId, user.id, dto.limit, dto.offset);
  }

  /**
   * 上传图片
   * POST /api/support/upload-image
   */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }

    // 返回图片URL
    const imageUrl = `/uploads/support-images/${file.filename}`;

    return {
      imageUrl,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * 标记消息已读
   * PUT /api/support/messages/read
   */
  @Put('messages/read')
  async markAsRead(@CurrentUser() user: any, @Body('conversationId') conversationId: string) {
    await this.supportService.markAsRead(conversationId, 'user');
    return { message: '已标记为已读' };
  }

  /**
   * 关闭对话
   * POST /api/support/conversation/:id/close
   */
  @Post('conversation/:id/close')
  async closeConversation(@CurrentUser() user: any, @Param('id') id: string) {
    // 验证权限
    const conversation = await this.supportService.prisma.chatConversation.findUnique({
      where: { id },
    });

    if (!conversation || conversation.userId !== user.id) {
      throw new ForbiddenException('无权操作此对话');
    }

    await this.supportService.closeConversation(id);
    return { message: '对话已关闭' };
  }

  /**
   * 获取用户的所有对话（包括历史）
   * GET /api/support/conversations
   */
  @Get('conversations')
  async getUserConversations(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return await this.supportService.getUserConversations(user.id, limit || 10);
  }
}
