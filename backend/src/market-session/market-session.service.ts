import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MarketSessionStatus,
  SubMarketStatus,
  CycleStatus,
  TransactionStatus,
  AccountType,
} from '@prisma/client';
import { CreateMarketSessionDto } from './dto/create-market-session.dto';
import { UpdateMarketSessionDto } from './dto/update-market-session.dto';
import { GetMarketSessionsDto } from './dto/get-market-sessions.dto';
import { GetSubMarketCyclesDto } from './dto/get-sub-market-cycles.dto';
import { TradeTypeRuleDto } from './dto/trade-type-rule.dto';
import { TransactionLogService } from '../transaction-log/transaction-log.service';

@Injectable()
export class MarketSessionService {
  private readonly logger = new Logger(MarketSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  /**
   * 创建大盘
   */
  async create(dto: CreateMarketSessionDto, createdById: string, createdByName: string) {
    const marketSession = await this.prisma.marketSession.create({
      data: {
        name: dto.name,
        description: dto.description,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        initialResult: dto.initialResult || 'PENDING',
        tradeTypes: this.normalizeTradeTypes(dto.tradeTypes),
        assetType: dto.assetType,
        createdById,
        createdByName,
      },
    });

    this.logger.log(`创建大盘: ${marketSession.id} - ${marketSession.name}`);
    return marketSession;
  }

  /**
   * 获取大盘列表
   */
  async findAll(dto: GetMarketSessionsDto) {
    const { status, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [marketSessions, total] = await Promise.all([
      this.prisma.marketSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { startTime: 'desc' }],
        include: {
          subMarkets: {
            select: {
              id: true,
              name: true,
              status: true,
              tradeDuration: true,
              profitRate: true,
              totalCycles: true,
              completedCycles: true,
            },
          },
        },
      }),
      this.prisma.marketSession.count({ where }),
    ]);

    return {
      marketSessions,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取大盘详情
   */
  async findOne(id: string) {
    const marketSession = await this.prisma.marketSession.findUnique({
      where: { id },
      include: {
        subMarkets: {
          include: {
            cycles: {
              orderBy: { cycleNumber: 'desc' },
              take: 5, // 只返回最近5个周期
            },
          },
        },
      },
    });

    if (!marketSession) {
      throw new NotFoundException('大盘不存在');
    }

    return marketSession;
  }

  /**
   * 更新大盘
   */
  async update(id: string, dto: UpdateMarketSessionDto) {
    const marketSession = await this.prisma.marketSession.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime && { endTime: new Date(dto.endTime) }),
        ...(dto.initialResult && { initialResult: dto.initialResult }),
        ...(dto.actualResult && { actualResult: dto.actualResult }),
        ...(dto.tradeTypes && {
          tradeTypes: this.normalizeTradeTypes(dto.tradeTypes),
        }),
        ...(dto.assetType && { assetType: dto.assetType }),
      },
    });

    this.logger.log(`更新大盘: ${id}`);
    return marketSession;
  }

  /**
   * 删除大盘
   */
  async remove(id: string) {
    const marketSession = await this.prisma.marketSession.findUnique({
      where: { id },
      include: { subMarkets: true },
    });

    if (!marketSession) {
      throw new NotFoundException('大盘不存在');
    }

    // 检查大盘状态，只能删除未开始或已完成的大盘
    if (marketSession.status === 'ACTIVE') {
      throw new BadRequestException('无法删除正在进行中的大盘');
    }

    await this.prisma.marketSession.delete({
      where: { id },
    });

    this.logger.log(`删除大盘: ${id}`);
    return { message: '删除成功' };
  }

  /**
   * 开启大盘
   * 核心功能：根据 TradingPerformance 配置自动创建小盘
   */
  async start(id: string) {
    const marketSession = await this.prisma.marketSession.findUnique({
      where: { id },
    });

    if (!marketSession) {
      throw new NotFoundException('大盘不存在');
    }

    if (marketSession.status !== 'PENDING') {
      throw new BadRequestException('大盘已开启或已完成');
    }

    // 1. 更新大盘状态为 ACTIVE
    await this.prisma.marketSession.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });

    // 2. 查询所有交易收益配置
    const tradingPerformances = await this.prisma.tradingPerformance.findMany({
      orderBy: { tradeDuration: 'asc' },
    });

    if (tradingPerformances.length === 0) {
      this.logger.warn('没有交易收益配置，无法创建小盘');
      throw new BadRequestException('系统尚未配置交易收益，请先配置后再开启大盘');
    }

    // 3. 为每个利率配置创建小盘
    const subMarkets = [];
    for (const tp of tradingPerformances) {
      const subMarket = await this.prisma.subMarket.create({
        data: {
          marketSessionId: id,
          name: `${tp.tradeDuration}秒 - ${tp.winRate}%利率`,
          tradeDuration: tp.tradeDuration,
          profitRate: tp.winRate,
          status: 'ACTIVE',
          startTime: new Date(),
        },
      });
      subMarkets.push(subMarket);

      this.logger.log(`创建小盘: ${subMarket.name}`);

      // 4. 为每个小盘启动第一个周期
      await this.startSubMarketCycle(subMarket.id);
    }

    this.logger.log(`大盘已开启: ${id}, 创建了 ${subMarkets.length} 个小盘`);

    return {
      marketSession: await this.findOne(id),
      subMarketsCreated: subMarkets.length,
    };
  }

  /**
   * 关闭大盘
   * 同时停止所有小盘
   */
  async stop(id: string) {
    const marketSession = await this.prisma.marketSession.findUnique({
      where: { id },
      include: { subMarkets: true },
    });

    if (!marketSession) {
      throw new NotFoundException('大盘不存在');
    }

    if (marketSession.status !== 'ACTIVE') {
      throw new BadRequestException('大盘未在运行中');
    }

    // 1. 停止所有小盘
    for (const subMarket of marketSession.subMarkets) {
      if (subMarket.status === 'ACTIVE') {
        await this.stopSubMarket(subMarket.id);
      }
    }

    // 2. 更新大盘状态为 COMPLETED
    await this.prisma.marketSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
      },
    });

    this.logger.log(`大盘已关闭: ${id}`);

    return {
      message: '大盘已关闭',
      marketSession: await this.findOne(id),
    };
  }

  /**
   * 启动小盘的新周期
   */
  async startSubMarketCycle(subMarketId: string) {
    const subMarket = await this.prisma.subMarket.findUnique({
      where: { id: subMarketId },
    });

    if (!subMarket) {
      throw new NotFoundException('小盘不存在');
    }

    const cycleNumber = subMarket.totalCycles + 1;
    const now = new Date();
    const endTime = new Date(now.getTime() + subMarket.tradeDuration * 1000);

    // 创建新周期
    const cycle = await this.prisma.subMarketCycle.create({
      data: {
        subMarketId,
        cycleNumber,
        startTime: now,
        endTime,
        status: CycleStatus.RUNNING,
      },
    });

    // 更新小盘统计
    await this.prisma.subMarket.update({
      where: { id: subMarketId },
      data: {
        totalCycles: { increment: 1 },
      },
    });

    this.logger.log(`小盘周期已启动: ${subMarketId} - 周期 ${cycleNumber}`);

    // TODO: 设置定时器，周期结束时自动结算
    // 这里需要使用 NestJS Schedule 模块或其他定时任务方案
    // setTimeout(() => {
    //   this.completeCycle(cycle.id);
    // }, subMarket.tradeDuration * 1000);

    return cycle;
  }

  /**
   * 完成小盘周期
   */
  async completeCycle(cycleId: string) {
    const cycle = await this.prisma.subMarketCycle.findUnique({
      where: { id: cycleId },
      include: { subMarket: { include: { marketSession: true } } },
    });

    if (!cycle) {
      throw new NotFoundException('小盘周期不存在');
    }

    if (cycle.status === CycleStatus.COMPLETED) {
      return cycle;
    }

    // 1. 结算周期内所有真实交易
    const pendingTransactions = await this.prisma.transactionLog.findMany({
      where: {
        subMarketCycleId: cycleId,
        status: TransactionStatus.PENDING,
        accountType: AccountType.REAL,
      },
      select: { orderNumber: true },
    });

    for (const tx of pendingTransactions) {
      try {
        await this.transactionLogService.settleTransactionBySystem(tx.orderNumber);
      } catch (error) {
        this.logger.error(
          `结算交易失败: ${tx.orderNumber}`,
          (error as Error).stack,
        );
      }
    }

    // 2. 更新周期状态
    await this.prisma.subMarketCycle.update({
      where: { id: cycleId },
      data: {
        status: CycleStatus.COMPLETED,
        endTime: new Date(),
      },
    });

    // 3. 更新小盘完成周期数
    await this.prisma.subMarket.update({
      where: { id: cycle.subMarketId },
      data: {
        completedCycles: { increment: 1 },
      },
    });

    // 4. 检查小盘和大盘是否还在运行，如果是则启动下一个周期
    if (
      cycle.subMarket.status === SubMarketStatus.ACTIVE &&
      cycle.subMarket.marketSession.status === MarketSessionStatus.ACTIVE
    ) {
      // 启动下一个周期
      await this.startSubMarketCycle(cycle.subMarketId);
    }

    this.logger.log(`周期已完成: ${cycleId}`);
    return this.prisma.subMarketCycle.findUnique({ where: { id: cycleId } });
  }

  /**
   * 停止小盘
   */
  async stopSubMarket(subMarketId: string) {
    const runningCycles = await this.prisma.subMarketCycle.findMany({
      where: { subMarketId, status: CycleStatus.RUNNING },
      select: { id: true },
    });

    for (const cycle of runningCycles) {
      await this.completeCycle(cycle.id);
    }

    await this.prisma.subMarket.update({
      where: { id: subMarketId },
      data: {
        status: SubMarketStatus.STOPPED,
        endTime: new Date(),
      },
    });

    // 停止所有正在运行的周期
    await this.prisma.subMarketCycle.updateMany({
      where: {
        subMarketId,
        status: CycleStatus.RUNNING,
      },
      data: {
        status: CycleStatus.COMPLETED,
        endTime: new Date(),
      },
    });

    this.logger.log(`小盘已停止: ${subMarketId}`);
  }

  /**
   * 分页获取小盘历史周期
   */
  async getSubMarketCycles(subMarketId: string, dto: GetSubMarketCyclesDto) {
    const { status, page = 1, limit = 20, from, to } = dto;
    const skip = (page - 1) * limit;

    const where: any = { subMarketId };
    if (status) {
      where.status = status;
    }
    if (from) {
      where.startTime = { ...(where.startTime || {}), gte: new Date(from) };
    }
    if (to) {
      where.startTime = { ...(where.startTime || {}), lte: new Date(to) };
    }

    const [cycles, total] = await Promise.all([
      this.prisma.subMarketCycle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { cycleNumber: 'desc' },
        include: {
          subMarket: {
            select: { id: true, name: true, profitRate: true, tradeDuration: true },
          },
        },
      }),
      this.prisma.subMarketCycle.count({ where }),
    ]);

    return {
      data: cycles,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取当前活跃的大盘（用户端）
   */
  async findActive() {
    const marketSessions = await this.prisma.marketSession.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        subMarkets: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
            name: true,
            tradeDuration: true,
            profitRate: true,
            totalCycles: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return marketSessions;
  }

  /**
   * 获取小盘的当前周期（用户端）
   */
  async getCurrentCycle(subMarketId: string) {
    const cycle = await this.prisma.subMarketCycle.findFirst({
      where: {
        subMarketId,
        status: 'RUNNING',
      },
      orderBy: { cycleNumber: 'desc' },
    });

    if (!cycle) {
      throw new NotFoundException('当前没有运行中的周期');
    }

    return cycle;
  }

  private normalizeTradeTypes(rules?: TradeTypeRuleDto[]) {
    if (!rules) {
      return undefined;
    }

    return rules.map((rule) => ({
      assetType: rule.assetType.toUpperCase(),
      durations: rule.durations,
    }));
  }
}
