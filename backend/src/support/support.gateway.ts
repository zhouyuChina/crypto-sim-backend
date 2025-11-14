import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { MessageType } from '@prisma/client';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/admin/chat', // 管理员客服系统命名空间
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SupportGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly supportService: SupportService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`客服系统客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`客服系统客户端断开: ${client.id}`);
  }

  /**
   * 加入对话房间
   * support:join
   */
  @SubscribeMessage('support:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; userType: 'user' | 'admin'; userId?: string },
  ) {
    try {
      const { conversationId, userType } = payload;
      const roomName = `support:conversation:${conversationId}`;

      // 加入房间
      client.join(roomName);

      // 确认加入
      client.emit('support:joined', { conversationId, roomName });

      this.logger.log(`${userType} 加入对话房间: ${roomName}`);

      return { success: true, roomName };
    } catch (error: any) {
      this.logger.error(`加入对话失败: ${error.message}`, error.stack);
      client.emit('support:error', { message: '加入对话失败' });
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送消息
   * support:message
   */
  @SubscribeMessage('support:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      senderId: string;
      senderType: 'USER' | 'ADMIN';
      senderName: string;
      messageType: MessageType;
      content: string;
      metadata?: any;
    },
  ) {
    try {
      const { conversationId, senderId, senderType, senderName, messageType, content, metadata } =
        payload;

      // 保存消息到数据库
      const message = await this.supportService.sendMessage(
        conversationId,
        senderId,
        senderType,
        senderName,
        messageType,
        content,
        metadata,
      );

      // 广播消息到房间内所有人
      const roomName = `support:conversation:${conversationId}`;
      this.server.to(roomName).emit('support:message', message);

      this.logger.log(`消息已发送: ${message.id}`);

      return { success: true, message };
    } catch (error: any) {
      this.logger.error(`发送消息失败: ${error.message}`, error.stack);
      client.emit('support:error', { message: '发送消息失败' });
      return { success: false, error: error.message };
    }
  }

  /**
   * 正在输入
   * support:typing
   */
  @SubscribeMessage('support:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      senderType: 'USER' | 'ADMIN';
      senderName: string;
    },
  ) {
    const { conversationId, senderType, senderName } = payload;
    const roomName = `support:conversation:${conversationId}`;

    // 广播"正在输入"状态（不发送给自己）
    client.to(roomName).emit('support:typing', { senderType, senderName });

    return { success: true };
  }

  /**
   * 标记已读
   * support:read
   */
  @SubscribeMessage('support:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      readerType: 'user' | 'admin';
    },
  ) {
    try {
      const { conversationId, readerType } = payload;

      await this.supportService.markAsRead(conversationId, readerType);

      // 通知对方消息已读
      const roomName = `support:conversation:${conversationId}`;
      this.server.to(roomName).emit('support:messages-read', {
        conversationId,
        readerType,
        readAt: new Date(),
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error(`标记已读失败: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * 离开对话
   * support:leave
   */
  @SubscribeMessage('support:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const { conversationId } = payload;
    const roomName = `support:conversation:${conversationId}`;

    client.leave(roomName);

    this.logger.log(`客户端离开对话房间: ${roomName}`);

    return { success: true };
  }

  /**
   * 管理员广播在线状态
   */
  broadcastAdminStatus(adminId: string, online: boolean) {
    this.server.emit('support:admin-status', { adminId, online });
  }

  /**
   * 通知对话状态变更
   */
  notifyConversationStatus(conversationId: string, status: string) {
    const roomName = `support:conversation:${conversationId}`;
    this.server.to(roomName).emit('support:conversation-status', {
      conversationId,
      status,
    });
  }
}
