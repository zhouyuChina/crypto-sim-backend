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
  Logger,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { SupportSseService } from './support-sse.service';
import { GetMessagesDto } from './dto/get-messages.dto';

@Controller('support')
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(
    private readonly supportService: SupportService,
    private readonly sseService: SupportSseService,
  ) {}

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
    try {
      this.logger.log(`getMessages called - User: ${user.id}, ConversationId: ${dto.conversationId || 'not provided'}, Limit: ${dto.limit}, Offset: ${dto.offset}`);

      // 如果没有传 conversationId，使用当前用户的对话
      let conversationId: string;

      if (!dto.conversationId) {
        this.logger.log(`No conversationId provided, fetching user conversation for user: ${user.id}`);
        const conversation = await this.supportService.getOrCreateUserConversation(user.id, user.displayName);
        conversationId = conversation.id;
        this.logger.log(`Using conversation: ${conversationId}`);
      } else {
        conversationId = dto.conversationId;
      }

      // 确保 limit 和 offset 是数字
      const limit = Number(dto.limit) || 50;
      const offset = Number(dto.offset) || 0;

      this.logger.log(`Fetching messages - ConversationId: ${conversationId}, Limit: ${limit}, Offset: ${offset}`);

      const result = await this.supportService.getMessages(
        conversationId,
        user.id,
        limit,
        offset
      );

      this.logger.log(`Successfully fetched ${result.messages.length} messages, Total: ${result.total}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error in getMessages: ${errorMessage}`, errorStack);
      throw error;
    }
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

  /**
   * SSE 订阅对话消息（客户端专用）
   * GET /api/support/sse/messages
   */
  @Sse('sse/messages')
  subscribeToMessages(
    @CurrentUser() user: any,
    @Query('conversationId') conversationId?: string,
  ): Observable<MessageEvent> {
    return new Observable((observer) => {
      // 获取或创建对话
      (async () => {
        try {
          let actualConversationId: string;

          if (!conversationId) {
            const conversation = await this.supportService.getOrCreateUserConversation(
              user.id,
              user.displayName,
            );
            actualConversationId = conversation.id;
          } else {
            actualConversationId = conversationId;
          }

          this.logger.log(
            `用户 ${user.id} 订阅对话 ${actualConversationId} 的 SSE 消息流`,
          );

          // 订阅 SSE 消息流
          const subject = this.sseService.subscribe(actualConversationId);

          // 转发消息到客户端
          const subscription = subject.subscribe({
            next: (event: MessageEvent) => observer.next(event),
            error: (err: any) => {
              this.logger.error(`SSE 推送错误: ${err.message}`);
              observer.error(err);
            },
            complete: () => observer.complete(),
          });

          // 发送连接成功消息
          observer.next({
            data: {
              type: 'connected',
              conversationId: actualConversationId,
              message: 'SSE 连接成功',
            },
          });

          // 客户端断开时清理
          return () => {
            this.logger.log(
              `用户 ${user.id} 断开对话 ${actualConversationId} 的 SSE 连接`,
            );
            subscription.unsubscribe();
            this.sseService.unsubscribe(actualConversationId, subject);
          };
        } catch (error) {
          this.logger.error(`SSE 订阅失败: ${error}`);
          observer.error(error);
        }
      })();
    });
  }
}
