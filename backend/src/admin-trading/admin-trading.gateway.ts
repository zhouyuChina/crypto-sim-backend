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
import { AdminTradingService } from './admin-trading.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/admin/trading', // 管理员交易监控命名空间
})
export class AdminTradingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AdminTradingGateway.name);

  @WebSocketServer()
  server!: Server;

  // 存储订阅的客户端（不使用 Redis）
  private subscribers = new Set<string>();

  constructor(private readonly adminTradingService: AdminTradingService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`交易监控客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`交易监控客户端断开: ${client.id}`);
    // 清理订阅
    this.subscribers.delete(client.id);
  }

  /**
   * 订阅交易更新
   * trading:subscribe
   */
  @SubscribeMessage('trading:subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { adminId: string },
  ) {
    try {
      const { adminId } = payload;

      // 添加到订阅集合
      this.subscribers.add(client.id);

      // 加入交易监控房间
      client.join('trading:monitor');

      // 获取当前活跃交易列表
      const activeTransactions = await this.adminTradingService.getActiveTransactions();

      // 发送当前状态
      client.emit('trading:initial-data', {
        transactions: activeTransactions,
        timestamp: new Date(),
      });

      this.logger.log(`管理员 ${adminId} 订阅交易监控，当前活跃交易: ${activeTransactions.length}`);

      return { success: true, count: activeTransactions.length };
    } catch (error: any) {
      this.logger.error(`订阅失败: ${error.message}`, error.stack);
      client.emit('trading:error', { message: '订阅失败' });
      return { success: false, error: error.message };
    }
  }

  /**
   * 取消订阅
   * trading:unsubscribe
   */
  @SubscribeMessage('trading:unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    this.subscribers.delete(client.id);
    client.leave('trading:monitor');

    this.logger.log(`客户端 ${client.id} 取消订阅交易监控`);

    return { success: true };
  }

  /**
   * 管理员编辑交易
   * trading:edit
   */
  @SubscribeMessage('trading:edit')
  async handleEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      transactionId: string;
      adminId: string;
      updates: any;
    },
  ) {
    try {
      const { transactionId, adminId, updates } = payload;

      const updatedTransaction = await this.adminTradingService.editTransaction(
        transactionId,
        adminId,
        updates,
      );

      // 广播更新到所有监控客户端
      this.broadcastTransactionUpdate(updatedTransaction, 'edited');

      this.logger.log(`交易 ${transactionId} 已被管理员 ${adminId} 编辑`);

      return { success: true, transaction: updatedTransaction };
    } catch (error: any) {
      this.logger.error(`编辑交易失败: ${error.message}`, error.stack);
      client.emit('trading:error', { message: '编辑交易失败' });
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员取消订单
   * trading:cancel
   */
  @SubscribeMessage('trading:cancel')
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      transactionId: string;
      adminId: string;
      reason?: string;
    },
  ) {
    try {
      const { transactionId, adminId, reason } = payload;

      const cancelledTransaction = await this.adminTradingService.cancelTransaction(
        transactionId,
        adminId,
        reason,
      );

      // 广播更新
      this.broadcastTransactionUpdate(cancelledTransaction, 'cancelled');

      this.logger.log(`交易 ${transactionId} 已被管理员 ${adminId} 取消`);

      return { success: true, transaction: cancelledTransaction };
    } catch (error: any) {
      this.logger.error(`取消交易失败: ${error.message}`, error.stack);
      client.emit('trading:error', { message: '取消交易失败' });
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员强制结算
   * trading:force-settle
   */
  @SubscribeMessage('trading:force-settle')
  async handleForceSettle(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      transactionId: string;
      adminId: string;
      settlementPrice?: number;
    },
  ) {
    try {
      const { transactionId, adminId, settlementPrice } = payload;

      const settledTransaction = await this.adminTradingService.forceSettleTransaction(
        transactionId,
        adminId,
        settlementPrice,
      );

      // 广播更新
      this.broadcastTransactionUpdate(settledTransaction, 'force-settled');

      this.logger.log(`交易 ${transactionId} 已被管理员 ${adminId} 强制结算`);

      return { success: true, transaction: settledTransaction };
    } catch (error: any) {
      this.logger.error(`强制结算失败: ${error.message}`, error.stack);
      client.emit('trading:error', { message: '强制结算失败' });
      return { success: false, error: error.message };
    }
  }

  /**
   * 广播交易更新到所有订阅者
   */
  broadcastTransactionUpdate(transaction: any, action: string) {
    this.server.to('trading:monitor').emit('trading:transaction-updated', {
      transaction,
      action,
      timestamp: new Date(),
    });
  }

  /**
   * 广播新交易
   */
  broadcastNewTransaction(transaction: any) {
    this.server.to('trading:monitor').emit('trading:new-transaction', {
      transaction,
      timestamp: new Date(),
    });
  }

  /**
   * 广播交易状态变更
   */
  broadcastTransactionStatusChange(transaction: any, oldStatus: string, newStatus: string) {
    this.server.to('trading:monitor').emit('trading:status-changed', {
      transaction,
      oldStatus,
      newStatus,
      timestamp: new Date(),
    });
  }
}
