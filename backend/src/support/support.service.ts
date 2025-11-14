import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, SenderType, MessageType } from '@prisma/client';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(public readonly prisma: PrismaService) {}

  /**
   * 获取或创建用户的对话
   */
  async getOrCreateUserConversation(userId: string, userName?: string) {
    // 查找用户的活跃对话（PENDING 或 ACTIVE）
    let conversation = await this.prisma.chatConversation.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // 最近50条消息
        },
      },
    });

    // 如果没有活跃对话，创建新对话
    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: {
          userId,
          userName: userName || null,
          status: 'PENDING',
        },
        include: {
          messages: true,
        },
      });

      this.logger.log(`创建新对话: ${conversation.id} for user ${userId}`);
    }

    return conversation;
  }

  /**
   * 获取对话消息历史（分页）
   */
  async getMessages(conversationId: string, userId: string, limit = 50, offset = 0) {
    // 验证用户权限
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('无权访问此对话');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.chatMessage.count({
      where: { conversationId },
    });

    return {
      messages: messages.reverse(), // 反转顺序，最旧的在前
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * 发送消息
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderType: SenderType,
    senderName: string,
    messageType: MessageType,
    content: string,
    metadata?: any,
  ) {
    // 创建消息
    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        senderType,
        senderName,
        messageType,
        content,
        metadata,
      },
    });

    // 更新对话信息
    const updateData: any = {
      lastMessageAt: new Date(),
      lastMessage: messageType === 'TEXT' ? content : '[图片]',
      lastMessageType: messageType,
      updatedAt: new Date(),
    };

    // 更新未读计数
    if (senderType === 'USER') {
      updateData.unreadAdminCount = { increment: 1 };
    } else if (senderType === 'ADMIN') {
      updateData.unreadUserCount = { increment: 1 };
    }

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    this.logger.log(`消息已发送: ${message.id} in ${conversationId}`);

    return message;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(conversationId: string, readerType: 'user' | 'admin') {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    // 清零未读计数
    const updateData: any = {};
    if (readerType === 'user') {
      updateData.unreadUserCount = 0;
    } else {
      updateData.unreadAdminCount = 0;
    }

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    // 标记相应的消息为已读
    const senderType = readerType === 'user' ? 'ADMIN' : 'USER';
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderType,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`对话 ${conversationId} 的消息已标记为已读 (${readerType})`);
  }

  /**
   * 关闭对话
   */
  async closeConversation(conversationId: string) {
    const conversation = await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    this.logger.log(`对话已关闭: ${conversationId}`);

    return conversation;
  }

  /**
   * 管理员：获取对话列表
   */
  async getAdminConversations(
    status?: ConversationStatus,
    adminId?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      // 默认只显示待处理和处理中的对话
      where.status = { in: ['PENDING', 'ACTIVE'] };
    }

    if (adminId) {
      where.adminId = adminId;
    }

    const [conversations, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where,
        orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    return {
      conversations,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 管理员：接管对话
   */
  async assignConversation(conversationId: string, adminId: string, adminName: string) {
    const conversation = await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        adminId,
        adminName,
        status: 'ACTIVE',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // 发送系统消息
    await this.sendMessage(
      conversationId,
      adminId,
      'SYSTEM',
      'System',
      'SYSTEM',
      `${adminName} 已加入对话`,
    );

    this.logger.log(`管理员 ${adminName} 接管了对话 ${conversationId}`);

    return conversation;
  }

  /**
   * 管理员：获取未读消息统计
   */
  async getUnreadCount(adminId?: string) {
    const where: any = {
      status: { in: ['PENDING', 'ACTIVE'] },
      unreadAdminCount: { gt: 0 },
    };

    if (adminId) {
      where.OR = [{ adminId }, { adminId: null }]; // 未分配的或分配给自己的
    }

    const [totalUnread, conversationCount] = await Promise.all([
      this.prisma.chatConversation.aggregate({
        where,
        _sum: { unreadAdminCount: true },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    return {
      totalUnread: totalUnread._sum.unreadAdminCount || 0,
      conversationCount,
    };
  }

  /**
   * 用户：获取自己的所有对话（包括历史）
   */
  async getUserConversations(userId: string, limit = 10) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return conversations;
  }
}
