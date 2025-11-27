import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

/**
 * SSE 交易监控服务
 * 用于替代 WebSocket 实现交易实时推送
 */
@Injectable()
export class AdminTradingSseService {
  private readonly logger = new Logger(AdminTradingSseService.name);

  // 存储所有订阅者的消息流
  private subscribers = new Set<Subject<MessageEvent>>();

  /**
   * 订阅交易更新
   */
  subscribe(): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.subscribers.add(subject);

    this.logger.log(`新订阅者加入，当前订阅者数: ${this.subscribers.size}`);

    return subject;
  }

  /**
   * 取消订阅
   */
  unsubscribe(subject: Subject<MessageEvent>) {
    this.subscribers.delete(subject);
    this.logger.log(`订阅者离开，剩余订阅者数: ${this.subscribers.size}`);
  }

  /**
   * 推送新交易
   */
  pushNewTransaction(transaction: any) {
    if (this.subscribers.size === 0) {
      this.logger.debug('没有订阅者，跳过推送新交易');
      return;
    }

    const event: MessageEvent = {
      data: {
        type: 'new-transaction',
        transaction,
        timestamp: new Date(),
      },
    };

    let successCount = 0;
    this.subscribers.forEach((subject) => {
      try {
        subject.next(event);
        successCount++;
      } catch (error) {
        this.logger.error('推送新交易失败:', error);
      }
    });

    this.logger.log(
      `新交易已推送: ${transaction.orderNumber}, 成功推送: ${successCount}/${this.subscribers.size}`,
    );
  }

  /**
   * 推送交易更新
   */
  pushTransactionUpdate(transaction: any, action: string) {
    if (this.subscribers.size === 0) {
      this.logger.debug('没有订阅者，跳过推送交易更新');
      return;
    }

    const event: MessageEvent = {
      data: {
        type: 'transaction-updated',
        transaction,
        action,
        timestamp: new Date(),
      },
    };

    let successCount = 0;
    this.subscribers.forEach((subject) => {
      try {
        subject.next(event);
        successCount++;
      } catch (error) {
        this.logger.error('推送交易更新失败:', error);
      }
    });

    this.logger.log(
      `交易更新已推送: ${transaction.orderNumber} (${action}), 成功推送: ${successCount}/${this.subscribers.size}`,
    );
  }

  /**
   * 推送交易状态变更
   */
  pushTransactionStatusChange(transaction: any, oldStatus: string, newStatus: string) {
    if (this.subscribers.size === 0) {
      this.logger.debug('没有订阅者，跳过推送状态变更');
      return;
    }

    const event: MessageEvent = {
      data: {
        type: 'status-changed',
        transaction,
        oldStatus,
        newStatus,
        timestamp: new Date(),
      },
    };

    let successCount = 0;
    this.subscribers.forEach((subject) => {
      try {
        subject.next(event);
        successCount++;
      } catch (error) {
        this.logger.error('推送状态变更失败:', error);
      }
    });

    this.logger.log(
      `状态变更已推送: ${transaction.orderNumber} (${oldStatus} -> ${newStatus}), 成功推送: ${successCount}/${this.subscribers.size}`,
    );
  }

  /**
   * 获取订阅统计信息
   */
  getStats() {
    return {
      totalSubscribers: this.subscribers.size,
    };
  }
}
