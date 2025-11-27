import { Controller, Logger, Sse, MessageEvent, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminTradingSseService } from './admin-trading-sse.service';
import { AdminTradingService } from './admin-trading.service';

@Controller('admin/trading')
export class AdminTradingSseController {
  private readonly logger = new Logger(AdminTradingSseController.name);

  constructor(
    private readonly sseService: AdminTradingSseService,
    private readonly tradingService: AdminTradingService,
  ) {}

  /**
   * SSE 订阅交易更新（管理端专用）
   * GET /api/admin/trading/sse/subscribe
   */
  @Sse('sse/subscribe')
  @Roles('admin')
  subscribeToTransactions(@CurrentUser() admin: any): Observable<MessageEvent> {
    return new Observable((observer) => {
      (async () => {
        try {
          this.logger.log(`管理员 ${admin.id} 订阅交易监控 SSE`);

          // 订阅 SSE 消息流
          const subject = this.sseService.subscribe();

          // 转发消息到客户端
          const subscription = subject.subscribe({
            next: (event: MessageEvent) => observer.next(event),
            error: (err: any) => {
              this.logger.error(`SSE 推送错误: ${err.message}`);
              observer.error(err);
            },
            complete: () => observer.complete(),
          });

          // 获取当前活跃交易列表
          const activeTransactions = await this.tradingService.getActiveTransactions();

          // 发送连接成功消息和初始数据
          observer.next({
            data: {
              type: 'connected',
              message: 'SSE 连接成功',
              transactions: activeTransactions,
              timestamp: new Date(),
            },
          });

          this.logger.log(
            `管理员 ${admin.id} SSE 连接成功，当前活跃交易: ${activeTransactions.length}`,
          );

          // 客户端断开时清理
          return () => {
            this.logger.log(`管理员 ${admin.id} 断开交易监控 SSE`);
            subscription.unsubscribe();
            this.sseService.unsubscribe(subject);
          };
        } catch (error) {
          this.logger.error(`SSE 订阅失败: ${error}`);
          observer.error(error);
        }
      })();
    });
  }
}
