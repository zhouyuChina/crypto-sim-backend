import {
  Injectable,
  Logger,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Redis } from 'ioredis';
import { Subject } from 'rxjs';

import { RedisService } from '../redis/redis.service';

const REDIS_SSE_CHANNEL = 'support:sse:messages';

/**
 * SSE 消息推送服务
 * 进程内 RxJS Subject + 可选 Redis pub/sub（多实例部署时跨节点广播）
 */
@Injectable()
export class SupportSseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupportSseService.name);
  private readonly instanceId = randomUUID();

  private conversationStreams = new Map<string, Set<Subject<MessageEvent>>>();
  private redisPub: Redis | null = null;
  private redisSub: Redis | null = null;
  private readonly redisEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly redisService?: RedisService,
  ) {
    this.redisEnabled = this.configService.get<boolean>('redis.enabled') ?? false;
  }

  async onModuleInit(): Promise<void> {
    if (!this.redisEnabled || !this.redisService) {
      return;
    }

    try {
      const db = this.configService.get<number>('redis.sessionDb');
      this.redisPub = this.redisService.getClient(db);
      this.redisSub = this.redisPub.duplicate();

      await this.redisSub.subscribe(REDIS_SSE_CHANNEL);
      this.redisSub.on('message', (_channel, payload) => {
        try {
          const { conversationId, event, origin } = JSON.parse(payload) as {
            conversationId: string;
            event: MessageEvent;
            origin: string;
          };

          if (origin === this.instanceId) {
            return;
          }

          this.deliverToLocalSubscribers(conversationId, event);
        } catch (error) {
          this.logger.error('解析 Redis SSE 消息失败', error);
        }
      });

      this.logger.log('客服 SSE Redis pub/sub 已启用');
    } catch (error) {
      this.logger.warn('客服 SSE Redis pub/sub 初始化失败，仅使用进程内推送', error);
      this.redisPub = null;
      this.redisSub = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    // 通知所有活跃的 SSE 客户端连接即将关闭
    this.conversationStreams.forEach((subjects) => {
      subjects.forEach((subject) => {
        try {
          subject.complete();
        } catch {
          // 忽略已关闭的 subject
        }
      });
    });
    this.conversationStreams.clear();

    if (this.redisSub) {
      const sub = this.redisSub;
      this.redisSub = null;
      try {
        await sub.unsubscribe(REDIS_SSE_CHANNEL);
        sub.disconnect();
      } catch {
        sub.disconnect();
      }
    }
  }

  subscribe(conversationId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    if (!this.conversationStreams.has(conversationId)) {
      this.conversationStreams.set(conversationId, new Set());
    }

    this.conversationStreams.get(conversationId)!.add(subject);

    this.logger.log(
      `新订阅者加入对话: ${conversationId}, 当前订阅者数: ${this.conversationStreams.get(conversationId)!.size}`,
    );

    return subject;
  }

  unsubscribe(conversationId: string, subject: Subject<MessageEvent>): void {
    const subscribers = this.conversationStreams.get(conversationId);
    if (!subscribers) {
      return;
    }

    subscribers.delete(subject);
    this.logger.log(
      `订阅者离开对话: ${conversationId}, 剩余订阅者数: ${subscribers.size}`,
    );

    if (subscribers.size === 0) {
      this.conversationStreams.delete(conversationId);
      this.logger.log(`对话 ${conversationId} 的所有订阅者已离开，清理资源`);
    }
  }

  pushMessage(conversationId: string, message: any): void {
    this.broadcastEvent(conversationId, {
      data: {
        type: 'new-message',
        message,
      },
    });
  }

  pushMessageRead(conversationId: string, readerType: 'user' | 'admin'): void {
    this.broadcastEvent(conversationId, {
      data: {
        type: 'messages-read',
        conversationId,
        readerType,
        readAt: new Date(),
      },
    });
  }

  pushConversationStatus(conversationId: string, status: string): void {
    this.broadcastEvent(conversationId, {
      data: {
        type: 'conversation-status',
        conversationId,
        status,
      },
    });
  }

  pushMessageRecalled(conversationId: string, messageId: string): void {
    this.broadcastEvent(conversationId, {
      data: {
        type: 'message-recalled',
        conversationId,
        messageId,
        recalledAt: new Date(),
      },
    });
  }

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

  private broadcastEvent(conversationId: string, event: MessageEvent): void {
    this.deliverToLocalSubscribers(conversationId, event);

    if (!this.redisPub) {
      return;
    }

    this.redisPub
      .publish(
        REDIS_SSE_CHANNEL,
        JSON.stringify({
          conversationId,
          event,
          origin: this.instanceId,
        }),
      )
      .catch((error) => {
        this.logger.error(`Redis SSE 广播失败 (${conversationId})`, error);
      });
  }

  private deliverToLocalSubscribers(conversationId: string, event: MessageEvent): void {
    const subscribers = this.conversationStreams.get(conversationId);

    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`对话 ${conversationId} 没有本地订阅者，跳过推送`);
      return;
    }

    let successCount = 0;
    const deadSubjects: Subject<MessageEvent>[] = [];

    subscribers.forEach((subject) => {
      try {
        subject.next(event);
        successCount++;
      } catch (error) {
        this.logger.error(`推送消息失败，移除失效订阅者:`, error);
        deadSubjects.push(subject);
      }
    });

    // 移除推送失败的死 Subject，避免后续重复报错
    deadSubjects.forEach((subject) => {
      subscribers.delete(subject);
    });
    if (subscribers.size === 0) {
      this.conversationStreams.delete(conversationId);
    }

    this.logger.log(
      `消息已推送到对话 ${conversationId}, 成功推送: ${successCount}/${subscribers.size}`,
    );
  }
}
