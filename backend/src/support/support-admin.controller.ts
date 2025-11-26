import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('admin/support')
export class SupportAdminController {
  private readonly logger = new Logger(SupportAdminController.name);

  constructor(
    private readonly supportService: SupportService,
    private readonly supportGateway: SupportGateway,
  ) {}

  /**
   * 获取对话列表
   * GET /api/admin/support/conversations
   */
  @Get('conversations')
  @Roles('admin')
  async getConversations(@Query() dto: GetConversationsDto) {
    return await this.supportService.getAdminConversations(
      dto.status,
      dto.adminId,
      dto.page,
      dto.limit,
    );
  }

  /**
   * 获取单个对话详情
   * GET /api/admin/support/conversations/:id
   */
  @Get('conversations/:id')
  @Roles('admin')
  async getConversation(@Param('id') id: string) {
    const conversation = await this.supportService.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new BadRequestException('对话不存在');
    }

    return conversation;
  }

  /**
   * 接管对话
   * POST /api/admin/support/conversations/:id/assign
   */
  @Post('conversations/:id/assign')
  @Roles('admin')
  async assignConversation(@Param('id') id: string, @CurrentUser() admin: any) {
    return await this.supportService.assignConversation(id, admin.id, admin.displayName || admin.username);
  }

  /**
   * 发送消息（管理员）
   * POST /api/admin/support/messages
   */
  @Post('messages')
  @Roles('admin')
  async sendMessage(@Body() dto: SendMessageDto, @CurrentUser() admin: any) {
    // 保存消息到数据库
    const message = await this.supportService.sendMessage(
      dto.conversationId,
      admin.id,
      'ADMIN',
      admin.displayName || admin.username,
      dto.messageType,
      dto.content,
      dto.metadata,
    );

    // 通过 WebSocket 实时推送给用户
    const roomName = `support:conversation:${dto.conversationId}`;
    this.supportGateway.server.to(roomName).emit('support:message', message);

    this.logger.log(`管理员消息已发送并推送: ${message.id}`);

    return message;
  }

  /**
   * 上传图片（管理员）
   * POST /api/admin/support/upload-image
   */
  @Post('upload-image')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }

    const imageUrl = `/uploads/support-images/${file.filename}`;

    return {
      imageUrl,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * 关闭对话
   * POST /api/admin/support/conversations/:id/close
   */
  @Post('conversations/:id/close')
  @Roles('admin')
  async closeConversation(@Param('id') id: string) {
    await this.supportService.closeConversation(id);
    return { message: '对话已关闭' };
  }

  /**
   * 获取未读消息统计
   * GET /api/admin/support/unread-count
   */
  @Get('unread-count')
  @Roles('admin')
  async getUnreadCount(@Query('adminId') adminId?: string) {
    return await this.supportService.getUnreadCount(adminId);
  }

  /**
   * 获取对话消息（管理员，支持分页）
   * GET /api/admin/support/messages
   */
  @Get('messages')
  @Roles('admin')
  async getMessages(
    @Query('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    this.logger.log(`Admin getMessages called - ConversationId: ${conversationId || 'not provided'}, Limit: ${limit}, Offset: ${offset}`);

    if (!conversationId) {
      this.logger.error('conversationId is required but not provided');
      throw new BadRequestException('conversationId 是必需的');
    }

    const result = await this.supportService.getAdminMessages(
      conversationId,
      Number(limit) || 50,
      Number(offset) || 0,
    );

    this.logger.log(`Admin successfully fetched ${result.messages.length} messages, Total: ${result.total}`);
    return result;
  }
}
