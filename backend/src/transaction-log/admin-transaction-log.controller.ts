import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminQueryTransactionsDto } from './dto/admin-query-transactions.dto';
import { AdminCreateTransactionDto } from './dto/admin-create-transaction.dto';
import { TransactionLogService } from './transaction-log.service';
import { ForceSettleTransactionDto } from './dto/force-settle-transaction.dto';

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminTransactionLogController {
  constructor(private readonly transactionLogService: TransactionLogService) {}

  @Get()
  async getTransactions(@Query() query: AdminQueryTransactionsDto) {
    return this.transactionLogService.getAdminTransactions(query);
  }

  /**
   * 管理端创建自定义交易流水
   */
  @Post('create')
  async createTransaction(
    @Body() dto: AdminCreateTransactionDto,
    @CurrentUser() admin: any,
  ) {
    return this.transactionLogService.adminCreateTransaction(
      dto,
      admin?.id || admin?.sub,
      admin?.displayName || admin?.username || admin?.email,
    );
  }

  /**
   * 后台强制结算单笔交易
   */
  @Post(':orderNumber/force-settle')
  async forceSettleTransaction(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: ForceSettleTransactionDto,
    @CurrentUser() admin: any,
  ) {
    return this.transactionLogService.forceSettleTransaction(orderNumber, {
      exitPrice: dto.exitPrice,
      result: dto.result,
      reason: dto.reason,
      operatorId: admin?.id || admin?.sub,
      operatorName: admin?.displayName || admin?.username || admin?.email,
    });
  }
}
