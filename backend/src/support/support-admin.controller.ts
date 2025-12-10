import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ExportConversationsDto } from './dto/export-conversations.dto';

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
    // Service 会自动保存并推送消息
    const message = await this.supportService.sendMessage(
      dto.conversationId,
      admin.id,
      'ADMIN',
      admin.displayName || admin.username,
      dto.messageType,
      dto.content,
      dto.metadata,
    );

    this.logger.log(`管理员消息已发送: ${message.id}`);

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

  /**
   * 撤回消息（管理员）
   * DELETE /api/admin/support/messages/:id
   */
  @Delete('messages/:id')
  @Roles('admin')
  async recallMessage(@Param('id') messageId: string, @CurrentUser() admin: any) {
    this.logger.log(`管理员 ${admin.id} 撤回消息: ${messageId}`);

    const result = await this.supportService.recallMessage(messageId, admin.id);

    this.logger.log(`消息撤回成功: ${messageId}`);
    return result;
  }

  /**
   * 导出客服记录
   * GET /api/admin/support/export
   * 支持 JSON 和 CSV 格式导出
   */
  @Get('export')
  @Roles('admin')
  async exportConversations(@Query() dto: ExportConversationsDto, @Res() res: Response) {
    this.logger.log(`导出客服记录 - 格式: ${dto.format || 'json'}, 过滤条件:`, {
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      userId: dto.userId,
      adminId: dto.adminId,
    });

    const format = dto.format || 'json';
    const filters = {
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      userId: dto.userId,
      adminId: dto.adminId,
    };

    if (format === 'csv') {
      const csvContent = await this.supportService.exportConversationsAsCSV(filters);
      const filename = `support_conversations_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // 添加 UTF-8 BOM，确保 Excel 正确识别中文
      res.send('\uFEFF' + csvContent);

      this.logger.log(`CSV 导出完成: ${filename}`);
    } else {
      // JSON 格式
      const conversations = await this.supportService.exportConversations(filters);
      const filename = `support_conversations_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const exportData = {
        exportDate: new Date().toISOString(),
        totalConversations: conversations.length,
        totalMessages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
        filters,
        conversations,
      };

      res.json(exportData);

      this.logger.log(`JSON 导出完成: ${filename}, 共 ${conversations.length} 个对话`);
    }
  }
}
