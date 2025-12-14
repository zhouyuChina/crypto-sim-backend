import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  TransactionStatus,
  AccountType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { SettingsService } from '../settings/settings.service';
import { AdminTradingGateway } from '../admin-trading/admin-trading.gateway';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { AdminQueryTransactionsDto } from './dto/admin-query-transactions.dto';
import { AdminCreateTransactionDto } from './dto/admin-create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { generateOrderNumber } from '../common/utils/order-number.generator';

type ForcedResult = 'WIN' | 'LOSE';

interface SettleTransactionOptions {
  forcedResult?: ForcedResult;
  reason?: string;
  operatorId?: string;
  operatorName?: string;
  manual?: boolean;
}

@Injectable()
export class TransactionLogService {
  private readonly logger = new Logger(TransactionLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
    private readonly settingsService: SettingsService,
    private readonly adminTradingGateway: AdminTradingGateway,
  ) {}

  /**
   * 创建新的交易记录
   */
  async createTransaction(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 确定账户类型，默认为虚拟账户
    const accountType = dto.accountType || AccountType.DEMO;

    // 根据账户类型检查余额
    const balance = accountType === AccountType.DEMO
      ? Number(user.demoBalance)
      : Number(user.realBalance);
    const entryAccountBalance = balance;

    if (balance < dto.investAmount) {
      throw new BadRequestException(
        `${accountType === AccountType.DEMO ? '虚拟' : '真实'}账户余额不足。当前余额: ${balance}, 需要: ${dto.investAmount}`,
      );
    }

    // 真实交易需要验证身份认证状态
    if (accountType === AccountType.REAL) {
      if (user.verificationStatus !== 'VERIFIED') {
        throw new ForbiddenException(
          '您需要完成身份认证后才能进行真实交易。请先完成身份认证。',
        );
      }
    }

    // 使用前端传入的入场价格
    const entryPrice = dto.entryPrice;

    // 生成唯一订单号
    const orderNumber = generateOrderNumber();

    // 计算时间
    const entryTime = new Date();
    const expiryTime = new Date(entryTime.getTime() + dto.duration * 1000);

    // 计算点差（简化处理，实际应该从配置或市场数据获取）
    const spread = entryPrice * 0.0001; // 0.01% 点差

    // 从系统设置获取托管模式状态
    let isManaged = false;
    try {
      const managedModeSetting = await this.settingsService.getSetting('trading.managedMode');
      isManaged = managedModeSetting.value === true || managedModeSetting.value === 'true';
    } catch {
      // 如果设置不存在，默认为 false
      isManaged = false;
    }

    // 查找当前活跃的大盘（真实仓需要关联大盘）
    let marketSessionId: string | null = null;
    if (accountType === AccountType.REAL) {
      const activeMarketSession = await this.prisma.marketSession.findFirst({
        where: {
          status: 'ACTIVE',
        },
        orderBy: { startTime: 'desc' },
      });
      if (activeMarketSession) {
        marketSessionId = activeMarketSession.id;
      }
      // 如果没有活跃的大盘，marketSessionId 为 null，结算时会判输
    }

    // 创建交易记录
    const transaction = await this.prisma.transactionLog.create({
      data: {
        userId,
        userName: user.displayName, // 添加用户名
        orderNumber,
        accountType,
        assetType: dto.assetType,
        direction: dto.direction,
        entryTime,
        expiryTime,
        duration: dto.duration,
        entryPrice: entryPrice,
        currentPrice: entryPrice,
        spread,
        investAmount: dto.investAmount,
        entryAccountBalance,
        returnRate: dto.returnRate,
        actualReturn: 0, // 初始为 0，结算时计算
        status: TransactionStatus.PENDING,
        isManaged, // 记录是否在托管状态下创建
        marketSessionId, // 关联大盘
      },
      include: {
        marketSession: {
          select: { name: true },
        },
      },
    });

    // 根据账户类型扣除投资金额
    if (accountType === AccountType.DEMO) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          demoBalance: {
            decrement: dto.investAmount,
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          realBalance: {
            decrement: dto.investAmount,
          },
        },
      });
    }

    this.logger.log(
      `交易创建成功: ${orderNumber}, 用户: ${userId}, 账户类型: ${accountType}, 资产: ${dto.assetType}`,
    );

    // 实时推送新交易到管理端
    const responseDto = this.mapToResponseDto(transaction);
    this.logger.log(`准备推送新交易到管理端: ${orderNumber}`);
    this.adminTradingGateway.broadcastNewTransaction(responseDto);
    this.logger.log(`新交易已推送: ${orderNumber}`);

    return responseDto;
  }

  /**
   * 获取交易记录列表（所有用户的交易）
   */
  async getUserTransactions(
    userId: string | null,
    query: QueryTransactionsDto,
  ): Promise<{
    data: TransactionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      assetType,
      direction,
      status,
      accountType,
      userName,
      isManaged,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionLogWhereInput = {
      ...(userId && { userId }),
      ...(assetType && { assetType }),
      ...(direction && { direction }),
      ...(status && { status }),
      ...(accountType && { accountType }),
      ...(userName && { userName: { contains: userName, mode: 'insensitive' } }),
      ...(typeof isManaged === 'boolean' && { isManaged }),
    };

    this.logger.log(`查询交易记录 - userId: ${userId || 'all'}, where: ${JSON.stringify(where)}, page: ${page}, limit: ${limit}`);

    // 先检查数据库连接和表是否存在
    try {
      const testCount = await this.prisma.transactionLog.count();
      this.logger.log(`数据库连接正常，TransactionLog 表总记录数: ${testCount}`);
    } catch (error: any) {
      this.logger.error(`数据库查询失败: ${error?.message || error}`);
      this.logger.error(`错误代码: ${error?.code}`);
      this.logger.error(`错误详情: ${JSON.stringify(error)}`);
      throw error;
    }

    let transactions: any[] = [];
    let total = 0;
    
    try {
      this.logger.log(`开始执行查询 - where: ${JSON.stringify(where)}, skip: ${skip}, take: ${limit}`);
      
      [transactions, total] = await Promise.all([
        this.prisma.transactionLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            marketSession: {
              select: { name: true },
            },
          },
        }),
        this.prisma.transactionLog.count({ where }),
      ]);
      
      this.logger.log(`查询成功 - 找到 ${transactions.length} 条记录，总计: ${total}`);
      
      if (transactions.length > 0) {
        this.logger.log(`第一条记录示例 - id: ${transactions[0].id}, orderNumber: ${transactions[0].orderNumber}`);
      } else {
        this.logger.warn(`查询结果为空，但总记录数为 ${total}，可能 skip/take 参数有问题`);
      }
    } catch (error: any) {
      this.logger.error(`查询执行失败: ${error?.message || error}`);
      this.logger.error(`错误堆栈: ${error?.stack}`);
      throw error;
    }

    try {
      const mappedData = transactions.map((t) => this.mapToResponseDto(t));
      this.logger.log(`数据映射成功 - 映射了 ${mappedData.length} 条记录`);
      
      return {
        data: mappedData,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      this.logger.error(`数据映射失败: ${error?.message || error}`);
      throw error;
    }
  }

  async getAdminTransactions(query: AdminQueryTransactionsDto) {
    const { userId, username, managedMode, marketSessionId, ...filters } = query;

    // 构建额外的查询条件
    const where: Prisma.TransactionLogWhereInput = {
      ...(userId && { userId }),
      ...(username && { userName: { contains: username, mode: 'insensitive' } }),
      ...(managedMode !== undefined && { isManaged: managedMode }),
      ...(marketSessionId && { marketSessionId }),
    };

    // 如果有额外的查询条件，需要合并到基础查询中
    if (Object.keys(where).length > 0) {
      const { page = 1, limit = 20, assetType, direction, status, accountType } = filters;
      const skip = (page - 1) * limit;

      const combinedWhere: Prisma.TransactionLogWhereInput = {
        ...where,
        ...(assetType && { assetType }),
        ...(direction && { direction }),
        ...(status && { status }),
        ...(accountType && { accountType }),
      };

      this.logger.log(`管理员查询交易记录 - where: ${JSON.stringify(combinedWhere)}, page: ${page}, limit: ${limit}`);

      const [transactions, total] = await Promise.all([
        this.prisma.transactionLog.findMany({
          where: combinedWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            marketSession: {
              select: { name: true },
            },
          },
        }),
        this.prisma.transactionLog.count({ where: combinedWhere }),
      ]);

      return {
        data: transactions.map((t) => this.mapToResponseDto(t)),
        total,
        page,
        limit,
      };
    }

    // 没有额外查询条件，使用原有逻辑
    return this.getUserTransactions(null, filters);
  }

  /**
   * 根据订单号获取交易详情
   */
  async getTransactionByOrderNumber(
    orderNumber: string,
    userId: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
      include: {
        marketSession: {
          select: { name: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    // 验证交易是否属于当前用户
    if (transaction.userId !== userId) {
      throw new ForbiddenException('无权访问该交易');
    }

    return this.mapToResponseDto(transaction);
  }

  /**
   * 更新交易的当前价格
   */
  async updateCurrentPrice(
    orderNumber: string,
    currentPrice: number,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.update({
      where: { orderNumber },
      data: { currentPrice },
    });

    return this.mapToResponseDto(transaction);
  }

  /**
   * 结算交易（用户手动结算，需要验证权限）
   */
  async settleTransaction(
    orderNumber: string,
    exitPrice: number,
    userId: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
      include: {
        marketSession: {
          select: { name: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    // 验证交易是否属于当前用户
    if (transaction.userId !== userId) {
      throw new ForbiddenException('无权操作该交易');
    }

    // 如果已经结算，直接返回结算结果（幂等性处理）
    if (transaction.status === TransactionStatus.SETTLED) {
      this.logger.log(`订单 ${orderNumber} 已结算，返回现有结果`);
      return this.mapToResponseDto(transaction);
    }

    // 如果已被取消，则不能结算
    if (transaction.status === TransactionStatus.CANCELED) {
      throw new BadRequestException(`订单 ${orderNumber} 已被取消，无法结算`);
    }

    // 调用内部结算方法
    return this.settleTransactionBySystem(orderNumber, exitPrice);
  }

  /**
   * 内部结算方法（不验证用户权限，用于系统/后台结算）
   */
  async settleTransactionBySystem(
    orderNumber: string,
    exitPrice?: number,
    options: SettleTransactionOptions = {},
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    if (transaction.status === TransactionStatus.CANCELED) {
      throw new BadRequestException(`订单 ${orderNumber} 已被取消，无法结算`);
    }

    const wasSettled = transaction.status === TransactionStatus.SETTLED;

    const resolvedExitPrice =
      exitPrice !== undefined
        ? exitPrice
        : await this.getCurrentPrice(transaction.assetType);

    // 新的判赢逻辑：默认全部判输，只有强制设置为WIN时才判赢
    let isWin: boolean;
    if (options.forcedResult) {
      // 只有强制设置为WIN时才判赢
      isWin = options.forcedResult === 'WIN';
      this.logger.log(`交易 ${orderNumber} 强制结算，结果: ${isWin ? '赢' : '输'}`);
    } else {
      // 默认判输
      isWin = false;
      this.logger.log(`交易 ${orderNumber} 自动结算，默认判输`);
    }

    const investAmount = Number(transaction.investAmount);
    const returnRate = Number(transaction.returnRate);
    const actualReturn = isWin
      ? investAmount * returnRate
      : -investAmount;

    const manualMetadata = options.manual
      ? {
          manualAdjusted: true,
          manualAdjustedById: options.operatorId,
          manualAdjustedByName: options.operatorName,
          manualAdjustmentReason: options.reason,
          manualAdjustedAt: new Date(),
        }
      : {};

    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { orderNumber },
      data: {
        exitPrice: resolvedExitPrice,
        currentPrice: resolvedExitPrice,
        actualReturn,
        status: TransactionStatus.SETTLED,
        settledAt: new Date(),
        ...manualMetadata,
      },
      include: {
        marketSession: {
          select: { name: true },
        },
      },
    });

    const settledAccountBalance = await this.updateUserAccountAfterSettle(
      transaction.userId,
      investAmount,
      actualReturn,
      isWin,
      transaction.accountType,
      {
        wasSettled,
        previousActualReturn: Number(transaction.actualReturn ?? 0),
      },
    );

    if (settledAccountBalance !== null) {
      await this.prisma.transactionLog.update({
        where: { id: updatedTransaction.id },
        data: { settledAccountBalance: new Prisma.Decimal(settledAccountBalance) },
      });
      (updatedTransaction as any).settledAccountBalance = new Prisma.Decimal(settledAccountBalance);
    }

    this.logger.log(
      `交易已结算: ${orderNumber}, 账户类型: ${transaction.accountType}, 结果: ${
        isWin ? '盈利' : '亏损'
      }, 实得: ${actualReturn}${
        options.manual ? '（人工干预）' : ''
      }`,
    );

    // 实时推送交易状态变更到管理端
    const responseDto = this.mapToResponseDto(updatedTransaction);
    this.adminTradingGateway.broadcastTransactionStatusChange(
      responseDto,
      transaction.status,
      TransactionStatus.SETTLED,
    );

    return responseDto;
  }

  /**
   * 取消交易（只能取消未结算的）
   */
  async cancelTransaction(
    orderNumber: string,
    userId: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.prisma.transactionLog.findUnique({
      where: { orderNumber },
    });

    if (!transaction) {
      throw new NotFoundException(`订单 ${orderNumber} 不存在`);
    }

    // 验证交易是否属于当前用户
    if (transaction.userId !== userId) {
      throw new ForbiddenException('无权操作该交易');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`订单 ${orderNumber} 不能取消`);
    }

    // 取消交易，退还本金
    const updatedTransaction = await this.prisma.transactionLog.update({
      where: { orderNumber },
      data: {
        status: TransactionStatus.CANCELED,
        actualReturn: 0,
      },
      include: {
        marketSession: {
          select: { name: true },
        },
      },
    });

    // 根据账户类型退还投资金额
    if (transaction.accountType === AccountType.DEMO) {
      await this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          demoBalance: {
            increment: Number(transaction.investAmount),
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          realBalance: {
            increment: Number(transaction.investAmount),
          },
        },
      });
    }

    this.logger.log(`交易已取消: ${orderNumber}`);

    return this.mapToResponseDto(updatedTransaction);
  }

  /**
   * 自动结算过期的交易
   */
  async autoSettleExpiredTransactions(): Promise<number> {
    const now = new Date();

    // 查找所有过期且未结算的交易
    const expiredTransactions = await this.prisma.transactionLog.findMany({
      where: {
        status: TransactionStatus.PENDING,
        expiryTime: {
          lte: now,
        },
      },
    });

    this.logger.log(`发现 ${expiredTransactions.length} 笔过期交易需要结算`);

    let settledCount = 0;
    for (const transaction of expiredTransactions) {
      try {
        // 优先使用交易记录中的当前价格（前端实时更新的），如果没有则从市场数据服务获取
        let exitPrice: number;

        if (transaction.currentPrice && Number(transaction.currentPrice) > 0) {
          // 使用前端最后更新的价格
          exitPrice = Number(transaction.currentPrice);
          this.logger.log(
            `使用交易记录中的价格进行结算: ${transaction.orderNumber}, 价格: ${exitPrice}`
          );
        } else {
          // 从市场数据服务获取（包含Binance API + 模拟价格备用方案）
          exitPrice = await this.getCurrentPrice(transaction.assetType);
          this.logger.log(
            `从市场数据服务获取价格进行结算: ${transaction.orderNumber}, 价格: ${exitPrice}`
          );
        }

        await this.settleTransactionBySystem(transaction.orderNumber, exitPrice, {
          reason: 'AUTO_EXPIRED',
        });
        settledCount++;
      } catch (error) {
        this.logger.error(
          `自动结算失败: ${transaction.orderNumber}`,
          (error as Error).stack,
        );
      }
    }

    this.logger.log(`自动结算完成: ${settledCount}/${expiredTransactions.length}`);
    return settledCount;
  }

  /**
   * 后台强制结算（可用于客服人工干预）
   */
  async forceSettleTransaction(
    orderNumber: string,
    params: {
      exitPrice?: number;
      result?: ForcedResult;
      reason?: string;
      operatorId: string;
      operatorName?: string;
    },
  ): Promise<TransactionResponseDto> {
    return this.settleTransactionBySystem(orderNumber, params.exitPrice, {
      forcedResult: params.result,
      reason: params.reason,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      manual: true,
    });
  }

  /**
   * 管理端创建自定义交易流水
   */
  async adminCreateTransaction(
    dto: AdminCreateTransactionDto,
    operatorId: string,
    operatorName?: string,
  ): Promise<TransactionResponseDto> {
    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 确定账户类型，默认为虚拟账户
    const accountType = dto.accountType || AccountType.DEMO;

    // 检查余额（如果是 PENDING 状态才需要扣款）
    const isPending = !dto.status || dto.status === TransactionStatus.PENDING;
    if (isPending) {
      const balance = accountType === AccountType.DEMO
        ? Number(user.demoBalance)
        : Number(user.realBalance);

      if (balance < dto.investAmount) {
        throw new BadRequestException(
          `${accountType === AccountType.DEMO ? '虚拟' : '真实'}账户余额不足。当前余额: ${balance}, 需要: ${dto.investAmount}`,
        );
      }
    }

    // 生成唯一订单号
    const orderNumber = generateOrderNumber();

    // 计算时间
    const entryTime = dto.entryTime || new Date();
    const expiryTime = new Date(entryTime.getTime() + dto.duration * 1000);

    // 计算点差
    const spread = dto.entryPrice * 0.0001; // 0.01% 点差

    // 获取托管模式状态
    let isManaged = false;
    try {
      const managedModeSetting = await this.settingsService.getSetting('trading.managedMode');
      isManaged = managedModeSetting.value === true || managedModeSetting.value === 'true';
    } catch {
      isManaged = false;
    }

    // 查找当前活跃的大盘（真实仓需要关联大盘）
    let marketSessionId: string | null = null;
    if (accountType === AccountType.REAL) {
      const activeMarketSession = await this.prisma.marketSession.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startTime: 'desc' },
      });
      if (activeMarketSession) {
        marketSessionId = activeMarketSession.id;
      }
    }

    // 确定交易状态
    const status = dto.status || TransactionStatus.PENDING;
    const shouldAutoSettle = dto.exitPrice && (dto.autoSettle !== false);

    // 计算实际收益（如果是已结算状态）
    let actualReturn = 0;
    let exitPrice = dto.exitPrice || null;
    let settledAt = null;

    if (status === TransactionStatus.SETTLED || shouldAutoSettle) {
      if (!dto.exitPrice) {
        throw new BadRequestException('结算状态的交易必须提供出场价格 (exitPrice)');
      }

      exitPrice = dto.exitPrice;
      // 管理员创建交易时默认判输
      const isWin = false;
      actualReturn = isWin
        ? dto.investAmount * dto.returnRate
        : -dto.investAmount;
      settledAt = new Date();
      this.logger.log(`管理员创建已结算交易: ${orderNumber}, 默认判输`);
    }

    // 创建交易记录
    const entryAccountBalance =
      accountType === AccountType.DEMO
        ? Number(user.demoBalance)
        : Number(user.realBalance);

    let transaction = await this.prisma.transactionLog.create({
      data: {
        userId: dto.userId,
        userName: user.displayName,
        orderNumber,
        accountType,
        assetType: dto.assetType,
        direction: dto.direction,
        entryTime,
        expiryTime,
        duration: dto.duration,
        entryPrice: dto.entryPrice,
        currentPrice: exitPrice || dto.entryPrice,
        exitPrice,
        spread,
        investAmount: dto.investAmount,
        entryAccountBalance,
        returnRate: dto.returnRate,
        actualReturn,
        status: shouldAutoSettle ? TransactionStatus.SETTLED : status,
        settledAt,
        isManaged,
        marketSessionId,
        manualAdjusted: true, // 标记为管理端创建
        manualAdjustedById: operatorId,
        manualAdjustedByName: operatorName,
        manualAdjustmentReason: dto.reason || '管理端创建自定义交易',
        manualAdjustedAt: new Date(),
      },
      include: {
        marketSession: {
          select: { name: true },
        },
      },
    });

    // 如果是 PENDING 状态，扣除投资金额
    if (isPending) {
      if (accountType === AccountType.DEMO) {
        await this.prisma.user.update({
          where: { id: dto.userId },
          data: {
            demoBalance: {
              decrement: dto.investAmount,
            },
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: dto.userId },
          data: {
            realBalance: {
              decrement: dto.investAmount,
            },
          },
        });
      }
    }

    // 如果是已结算状态，更新用户账户
    if (status === TransactionStatus.SETTLED || shouldAutoSettle) {
      const settledAccountBalance = await this.updateUserAccountAfterSettle(
        dto.userId,
        dto.investAmount,
        actualReturn,
        actualReturn > 0,
        accountType,
        { wasSettled: false, previousActualReturn: 0 },
      );
      if (settledAccountBalance !== null) {
        await this.prisma.transactionLog.update({
          where: { id: transaction.id },
          data: { settledAccountBalance: new Prisma.Decimal(settledAccountBalance) },
        });
        transaction = {
          ...transaction,
          settledAccountBalance: new Prisma.Decimal(settledAccountBalance),
        };
      }
    }

    this.logger.log(
      `管理端创建交易: ${orderNumber}, 用户: ${dto.userId}, 操作员: ${operatorName || operatorId}, 状态: ${status}`,
    );

    // 实时推送新交易到管理端
    const responseDto = this.mapToResponseDto(transaction);
    this.adminTradingGateway.broadcastNewTransaction(responseDto);

    return responseDto;
  }

  /**
   * 获取用户统计数据（仅统计真实仓）
   */
  async getUserStatistics(userId: string) {
    const [totalTransactions, winTransactions, user] = await Promise.all([
      this.prisma.transactionLog.count({
        where: {
          userId,
          status: TransactionStatus.SETTLED,
          accountType: AccountType.REAL, // 只统计真实仓
        },
      }),
      this.prisma.transactionLog.count({
        where: {
          userId,
          status: TransactionStatus.SETTLED,
          accountType: AccountType.REAL, // 只统计真实仓
          actualReturn: { gt: 0 },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          accountBalance: true,
          demoBalance: true,
          realBalance: true,
          totalProfitLoss: true,
          winRate: true,
          totalTrades: true,
        },
      }),
    ]);

    const winRate =
      totalTransactions > 0 ? (winTransactions / totalTransactions) * 100 : 0;

    return {
      accountBalance: Number(user?.accountBalance || 0), // 旧字段，兼容性
      demoBalance: Number(user?.demoBalance || 0),
      realBalance: Number(user?.realBalance || 0),
      totalProfitLoss: Number(user?.totalProfitLoss || 0),
      winRate: Number(winRate.toFixed(2)),
      totalTrades: user?.totalTrades || 0,
      settledTrades: totalTransactions,
      winningTrades: winTransactions,
      losingTrades: totalTransactions - winTransactions,
    };
  }

  // ========== 私有辅助方法 ==========

  /**
   * 获取当前市场价格
   */
  private async getCurrentPrice(assetType: string): Promise<number> {
    try {
      return await this.marketDataService.getLatestPrice(assetType);
    } catch (error) {
      this.logger.error(
        `获取 ${assetType} 最新价格失败: ${(error as Error).message}`,
      );
      throw new BadRequestException('暂时无法获取实时价格，请稍后再试');
    }
  }

  /**
   * 结算后更新用户账户
   */
  private async updateUserAccountAfterSettle(
    userId: string,
    investAmount: number,
    actualReturn: number,
    _isWin: boolean,
    accountType: AccountType = AccountType.DEMO,
    options?: { wasSettled?: boolean; previousActualReturn?: number },
  ): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const wasSettled = options?.wasSettled ?? false;
    const previousActualReturn = options?.previousActualReturn ?? 0;
    const balanceDelta = wasSettled
      ? actualReturn - previousActualReturn
      : investAmount + actualReturn;

    // 根据账户类型获取当前余额
    const currentBalance =
      accountType === AccountType.DEMO
        ? Number(user.demoBalance)
        : Number(user.realBalance);

    const currentProfitLoss = Number(user.totalProfitLoss);
    const currentTotalTrades = user.totalTrades;

    // 计算新的余额（实得可能是负数）
    const newBalance = currentBalance + balanceDelta;

    // 只有真实仓才更新总盈亏和胜率
    let updateData: any;

    if (accountType === AccountType.REAL) {
      // 真实仓：更新总盈亏、交易次数和胜率
      const profitDelta = actualReturn - previousActualReturn;
      let newTotalTrades = currentTotalTrades;
      if (!wasSettled) {
        newTotalTrades += 1;
      }
      const newProfitLoss = currentProfitLoss + profitDelta;

      // 计算新的胜率（只统计真实仓）
      const winTrades = await this.prisma.transactionLog.count({
        where: {
          userId,
          status: TransactionStatus.SETTLED,
          accountType: AccountType.REAL, // 只统计真实仓
          actualReturn: { gt: 0 },
        },
      });
      const newWinRate =
        newTotalTrades > 0 ? (winTrades / newTotalTrades) * 100 : 0;

      updateData = {
        realBalance: newBalance,
        totalProfitLoss: newProfitLoss,
        totalTrades: newTotalTrades,
        winRate: newWinRate,
      };
    } else {
      // 模拟仓：只更新模拟仓余额，不影响统计数据
      updateData = {
        demoBalance: newBalance,
      };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return newBalance;
  }

  /**
   * 映射到响应 DTO
   */
  private mapToResponseDto(transaction: any): TransactionResponseDto {
    return {
      id: transaction.id,
      userId: transaction.userId,
      userName: transaction.userName,  // 添加用户名
      orderNumber: transaction.orderNumber,
      accountType: transaction.accountType,
      assetType: transaction.assetType,
      direction: transaction.direction,
      entryTime: transaction.entryTime,
      expiryTime: transaction.expiryTime,
      duration: transaction.duration,
      entryPrice: Number(transaction.entryPrice),
      currentPrice: transaction.currentPrice ? Number(transaction.currentPrice) : null,
      exitPrice: transaction.exitPrice ? Number(transaction.exitPrice) : null,
      spread: Number(transaction.spread),
      investAmount: Number(transaction.investAmount),
      entryAccountBalance:
        transaction.entryAccountBalance !== null && transaction.entryAccountBalance !== undefined
          ? Number(transaction.entryAccountBalance)
          : null,
      returnRate: Number(transaction.returnRate),
      actualReturn: Number(transaction.actualReturn),
      settledAccountBalance:
        transaction.settledAccountBalance !== null && transaction.settledAccountBalance !== undefined
          ? Number(transaction.settledAccountBalance)
          : null,
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      settledAt: transaction.settledAt,
      isManaged: transaction.isManaged ?? false,
      marketSessionId: transaction.marketSessionId ?? null,
      marketSessionName: transaction.marketSession?.name ?? null,
    };
  }
}
