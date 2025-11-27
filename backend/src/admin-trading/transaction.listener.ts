import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AdminTradingGateway } from './admin-trading.gateway';

@Injectable()
export class TransactionListener {
  private readonly logger = new Logger(TransactionListener.name);

  constructor(private readonly adminTradingGateway: AdminTradingGateway) {}

  /**
   * 监听交易创建事件
   */
  @OnEvent('transaction.created')
  handleTransactionCreated(payload: any) {
    this.logger.log(`新交易创建: ${payload.transaction.id}`);
    this.adminTradingGateway.broadcastNewTransaction(payload.transaction);
  }

  /**
   * 监听交易状态变更事件
   */
  @OnEvent('transaction.status-changed')
  handleTransactionStatusChanged(payload: any) {
    const { transaction, oldStatus, newStatus } = payload;
    this.logger.log(`交易状态变更: ${transaction.id} (${oldStatus} -> ${newStatus})`);
    this.adminTradingGateway.broadcastTransactionStatusChange(transaction, oldStatus, newStatus);
  }

  /**
   * 监听交易编辑事件
   */
  @OnEvent('transaction.edited')
  handleTransactionEdited(payload: any) {
    this.logger.log(`交易已编辑: ${payload.transaction.id}`);
    this.adminTradingGateway.broadcastTransactionUpdate(payload.transaction, 'edited');
  }

  /**
   * 监听交易取消事件
   */
  @OnEvent('transaction.cancelled')
  handleTransactionCancelled(payload: any) {
    this.logger.log(`交易已取消: ${payload.transaction.id}`);
    this.adminTradingGateway.broadcastTransactionUpdate(payload.transaction, 'cancelled');
  }

  /**
   * 监听交易强制结算事件
   */
  @OnEvent('transaction.force-settled')
  handleTransactionForceSettled(payload: any) {
    this.logger.log(`交易已强制结算: ${payload.transaction.id}`);
    this.adminTradingGateway.broadcastTransactionUpdate(payload.transaction, 'force-settled');
  }

  /**
   * 监听交易更新事件（通用）
   */
  @OnEvent('transaction.updated')
  handleTransactionUpdated(payload: any) {
    this.logger.log(`交易已更新: ${payload.transaction.id}`);
    this.adminTradingGateway.broadcastTransactionUpdate(payload.transaction, 'updated');
  }
}
