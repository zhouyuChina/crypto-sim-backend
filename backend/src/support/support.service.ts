import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationStatus, SenderType, MessageType } from '@prisma/client';
import { SupportGateway } from './support.gateway';
import { SupportSseService } from './support-sse.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  // 用于防止并发创建对话的锁
  private readonly creatingConversations = new Map<string, Promise<any>>();

  constructor(
    public readonly prisma: PrismaService,
    @Inject(forwardRef(() => SupportGateway))
    private readonly supportGateway: SupportGateway,
    private readonly sseService: SupportSseService,
  ) {}

  /**
   * 获取或创建用户的对话
   * 使用内存锁防止并发创建重复对话
   */
  async getOrCreateUserConversation(userId: string, userName?: string) {
    // 先尝试查找用户的活跃对话（PENDING 或 ACTIVE）
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

    // 如果找到了，直接返回
    if (conversation) {
      return conversation;
    }

    // 检查是否正在创建中
    const existingPromise = this.creatingConversations.get(userId);
    if (existingPromise) {
      this.logger.log(`等待已有的创建请求完成: userId=${userId}`);
      return existingPromise;
    }

    // 创建新对话的 Promise
    const createPromise = (async () => {
      try {
        // 再次检查（双重检查锁定模式）
        const existingConversation = await this.prisma.chatConversation.findFirst({
          where: {
            userId,
            status: { in: ['PENDING', 'ACTIVE'] },
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 50,
            },
          },
        });

        if (existingConversation) {
          this.logger.log(`发现已存在的对话: ${existingConversation.id}`);
          return existingConversation;
        }

        // 创建新对话
        const newConversation = await this.prisma.chatConversation.create({
          data: {
            userId,
            userName: userName || null,
            status: 'PENDING',
          },
          include: {
            messages: true,
          },
        });

        this.logger.log(`创建新对话: ${newConversation.id} for user ${userId}`);
        return newConversation;
      } finally {
        // 清理锁
        this.creatingConversations.delete(userId);
      }
    })();

    // 存储创建 Promise
    this.creatingConversations.set(userId, createPromise);

    return createPromise;
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

    // ✅ 通过 WebSocket 实时推送消息
    const roomName = `support:conversation:${conversationId}`;
    this.supportGateway.server.to(roomName).emit('support:message', message);
    this.logger.log(`消息已推送到 WebSocket 房间: ${roomName}`);

    // ✅ 通过 SSE 实时推送消息（用于客户端）
    this.sseService.pushMessage(conversationId, message);
    this.logger.log(`消息已推送到 SSE: ${conversationId}`);

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

  /**
   * 管理员：获取对话消息（不需要验证权限）
   */
  async getAdminMessages(conversationId: string, limit = 50, offset = 0) {
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
   * 管理员：撤回消息（直接删除）
   */
  async recallMessage(messageId: string, adminId: string) {
    // 1. 查找消息
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    // 2. 验证权限：只能撤回管理员自己发送的消息
    if (message.senderType !== 'ADMIN') {
      throw new ForbiddenException('只能撤回管理员消息');
    }

    if (message.senderId !== adminId) {
      throw new ForbiddenException('只能撤回自己发送的消息');
    }

    // 3. 删除消息
    await this.prisma.chatMessage.delete({
      where: { id: messageId },
    });

    this.logger.log(`管理员 ${adminId} 撤回了消息 ${messageId}`);

    // 4. 推送撤回事件到 WebSocket
    const roomName = `support:conversation:${message.conversationId}`;
    this.supportGateway.server.to(roomName).emit('support:message_recalled', {
      messageId,
      conversationId: message.conversationId,
    });
    this.logger.log(`消息撤回事件已推送到 WebSocket 房间: ${roomName}`);

    // 5. 推送撤回事件到 SSE
    this.sseService.pushMessageRecalled(message.conversationId, messageId);
    this.logger.log(`消息撤回事件已推送到 SSE: ${message.conversationId}`);

    return {
      success: true,
      message: '消息已撤回',
      messageId,
    };
  }

  /**
   * 管理员：导出客服记录
   */
  async exportConversations(filters: {
    status?: ConversationStatus;
    startDate?: string;
    endDate?: string;
    userId?: string;
    adminId?: string;
  }) {
    const where: any = {};

    // 状态过滤
    if (filters.status) {
      where.status = filters.status;
    }

    // 日期范围过滤
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // 用户过滤
    if (filters.userId) {
      where.userId = filters.userId;
    }

    // 管理员过滤
    if (filters.adminId) {
      where.adminId = filters.adminId;
    }

    // 查询对话及其消息
    const conversations = await this.prisma.chatConversation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            phoneNumber: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`导出了 ${conversations.length} 个对话记录`);

    return conversations;
  }

  /**
   * 管理员：导出客服记录为 CSV 格式
   * 每条消息作为单独的行导出
   */
  async exportConversationsAsCSV(filters: {
    status?: ConversationStatus;
    startDate?: string;
    endDate?: string;
    userId?: string;
    adminId?: string;
  }): Promise<string> {
    const conversations = await this.exportConversations(filters);

    // CSV 头部
    const headers = [
      '对话ID',
      '用户ID',
      '用户邮箱',
      '用户名称',
      '管理员ID',
      '管理员名称',
      '对话状态',
      '对话创建时间',
      '消息ID',
      '消息发送者类型',
      '消息发送者ID',
      '消息发送者名称',
      '消息类型',
      '消息内容',
      '消息时间',
      '是否已读',
    ];

    // CSV 行：将每条消息展开为单独的行
    const rows: any[] = [];
    conversations.forEach((conv) => {
      if (conv.messages.length === 0) {
        // 如果没有消息，至少导出对话信息
        rows.push([
          conv.id,
          conv.userId,
          conv.user.email || '',
          conv.user.displayName || '',
          conv.adminId || '',
          conv.adminName || '',
          conv.status,
          conv.createdAt.toISOString(),
          '',
          '',
          '',
          '',
          '',
          '(无消息)',
          '',
          '',
        ]);
      } else {
        // 每条消息一行
        conv.messages.forEach((msg) => {
          rows.push([
            conv.id,
            conv.userId,
            conv.user.email || '',
            conv.user.displayName || '',
            conv.adminId || '',
            conv.adminName || '',
            conv.status,
            conv.createdAt.toISOString(),
            msg.id,
            msg.senderType,
            msg.senderId,
            msg.senderName,
            msg.messageType,
            msg.content,
            msg.createdAt.toISOString(),
            msg.isRead ? '是' : '否',
          ]);
        });
      }
    });

    // 生成 CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csvContent;
  }
}
