import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';

import type { UserEntity } from '../auth/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { SettleTransactionDto } from './dto/settle-transaction.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { UnifiedTransactionDto, TransactionType } from './dto/unified-transaction.dto';
import { TransactionLogService } from './transaction-log.service';

@Controller('transactions')
export class TransactionLogController {
  constructor(private readonly transactionLogService: TransactionLogService) {}

  /**
   * 统一交易接口（创建新交易或结算交易）
   * POST /transactions
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async handleTransaction(
    @CurrentUser() user: UserEntity,
    @Body() dto: UnifiedTransactionDto,
  ) {
    if (dto.type === TransactionType.ENTRY) {
      // 入场：创建新交易
      const createDto: CreateTransactionDto = {
        assetType: dto.assetType!,
        direction: dto.direction!,
        duration: dto.duration!,
        entryPrice: dto.price,
        investAmount: dto.investAmount!,
        returnRate: dto.returnRate!,
        accountType: dto.accountType,
      };
      return this.transactionLogService.createTransaction(user.id, createDto);
    } else {
      // 出场：结算交易
      return this.transactionLogService.settleTransaction(
        dto.orderNumber!,
        dto.price,
        user.id,
      );
    }
  }

  /**
   * 获取当前用户的交易列表
   * GET /transactions
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  getUserTransactions(
    @CurrentUser() user: UserEntity,
    @Query() query: QueryTransactionsDto,
  ) {
    const logger = new Logger(TransactionLogController.name);
    logger.log(`获取交易列表 - userId: ${user.id}, query: ${JSON.stringify(query)}`);
    return this.transactionLogService.getUserTransactions(user.id, query);
  }

  /**
   * 获取当前用户的统计数据
   * GET /transactions/statistics
   */
  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  getUserStatistics(@CurrentUser() user: UserEntity) {
    return this.transactionLogService.getUserStatistics(user.id);
  }

  /**
   * 根据订单号获取交易详情
   * GET /transactions/:orderNumber
   */
  @UseGuards(JwtAuthGuard)
  @Get(':orderNumber')
  getTransactionByOrderNumber(
    @CurrentUser() user: UserEntity,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.transactionLogService.getTransactionByOrderNumber(orderNumber, user.id);
  }

  /**
   * 手动结算交易
   * POST /transactions/:orderNumber/settle
   */
  @UseGuards(JwtAuthGuard)
  @Post(':orderNumber/settle')
  settleTransaction(
    @CurrentUser() user: UserEntity,
    @Param('orderNumber') orderNumber: string,
    @Body() dto: SettleTransactionDto,
  ) {
    return this.transactionLogService.settleTransaction(orderNumber, dto.exitPrice, user.id);
  }

  /**
   * 取消交易
   * POST /transactions/:orderNumber/cancel
   */
  @UseGuards(JwtAuthGuard)
  @Post(':orderNumber/cancel')
  cancelTransaction(
    @CurrentUser() user: UserEntity,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.transactionLogService.cancelTransaction(orderNumber, user.id);
  }

  /**
   * 更新交易的当前价格（前端实时推送）
   * PATCH /transactions/:orderNumber/price
   */
  @Public()
  @Patch(':orderNumber/price')
  updateCurrentPrice(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.transactionLogService.updateCurrentPrice(orderNumber, dto.currentPrice);
  }

  /**
   * 触发自动结算过期交易（管理员或定时任务使用）
   * POST /transactions/auto-settle
   */
  @Public()
  @Post('auto-settle')
  autoSettleExpiredTransactions() {
    return this.transactionLogService.autoSettleExpiredTransactions();
  }
}
