import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

/**
 * SSE 消息推送服务
 * 用于替代 WebSocket 实现客服消息实时推送
 */
@Injectable()
export class SupportSseService {
  private readonly logger = new Logger(SupportSseService.name);

  // 存储每个对话的消息流
  // key: conversationId, value: Subject 用于推送消息
  private conversationStreams = new Map<string, Set<Subject<MessageEvent>>>();

  /**
   * 订阅对话消息
   */
  subscribe(conversationId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // 获取或创建该对话的订阅者集合
    if (!this.conversationStreams.has(conversationId)) {
      this.conversationStreams.set(conversationId, new Set());
    }

    this.conversationStreams.get(conversationId)!.add(subject);

    this.logger.log(
      `新订阅者加入对话: ${conversationId}, 当前订阅者数: ${this.conversationStreams.get(conversationId)!.size}`,
    );

    return subject;
  }

  /**
   * 取消订阅
   */
  unsubscribe(conversationId: string, subject: Subject<MessageEvent>) {
    const subscribers = this.conversationStreams.get(conversationId);
    if (subscribers) {
      subscribers.delete(subject);
      this.logger.log(
        `订阅者离开对话: ${conversationId}, 剩余订阅者数: ${subscribers.size}`,
      );

      // 如果没有订阅者了，清理该对话的流
      if (subscribers.size === 0) {
        this.conversationStreams.delete(conversationId);
        this.logger.log(`对话 ${conversationId} 的所有订阅者已离开，清理资源`);
      }
    }
  }

  /**
   * 推送新消息到对话的所有订阅者
   */
  pushMessage(conversationId: string, message: any) {
    const subscribers = this.conversationStreams.get(conversationId);

    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`对话 ${conversationId} 没有订阅者，跳过推送`);
      return;
    }

    const event: MessageEvent = {
      data: {
        type: 'new-message',
        message,
      },
    };

    let successCount = 0;
    subscribers.forEach((subject) => {
      try {
        subject.next(event);
        successCount++;
      } catch (error) {
        this.logger.error(`推送消息失败:`, error);
      }
    });

    this.logger.log(
      `消息已推送到对话 ${conversationId}, 成功推送: ${successCount}/${subscribers.size}`,
    );
  }

  /**
   * 推送消息已读通知
   */
  pushMessageRead(conversationId: string, readerType: 'user' | 'admin') {
    const subscribers = this.conversationStreams.get(conversationId);

    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`对话 ${conversationId} 没有订阅者，跳过已读通知`);
      return;
    }

    const event: MessageEvent = {
      data: {
        type: 'messages-read',
        conversationId,
        readerType,
        readAt: new Date(),
      },
    };

    subscribers.forEach((subject) => {
      try {
        subject.next(event);
      } catch (error) {
        this.logger.error(`推送已读通知失败:`, error);
      }
    });

    this.logger.log(`已读通知已推送到对话 ${conversationId}`);
  }

  /**
   * 推送对话状态变更
   */
  pushConversationStatus(conversationId: string, status: string) {
    const subscribers = this.conversationStreams.get(conversationId);

    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`对话 ${conversationId} 没有订阅者，跳过状态推送`);
      return;
    }

    const event: MessageEvent = {
      data: {
        type: 'conversation-status',
        conversationId,
        status,
      },
    };

    subscribers.forEach((subject) => {
      try {
        subject.next(event);
      } catch (error) {
        this.logger.error(`推送状态变更失败:`, error);
      }
    });

    this.logger.log(`状态变更已推送到对话 ${conversationId}: ${status}`);
  }

  /**
   * 获取订阅统计信息
   */
  getStats() {
    const stats = {
      totalConversations: this.conversationStreams.size,
      conversations: [] as { conversationId: string; subscribers: number }[],
    };

    this.conversationStreams.forEach((subscribers, conversationId) => {
      stats.conversations.push({
        conversationId,
        subscribers: subscribers.size,
      });
    });

    return stats;
  }
}
