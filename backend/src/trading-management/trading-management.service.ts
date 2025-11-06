import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CreateTradingSessionDto } from './dto/create-trading-session.dto';
import { QueryTradingSessionsDto } from './dto/query-trading-sessions.dto';
import { QueryTradingCyclesDto } from './dto/query-trading-cycles.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TradingManagementService {
  private readonly logger = new Logger(TradingManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  /**
   * 创建交易托管会话
   */
  async createSession(dto: CreateTradingSessionDto, adminId: string, adminName?: string) {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, displayName: true }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查该用户是否已有活动的托管会话
    const existingSession = await this.prisma.tradingSession.findFirst({
      where: {
        userId: dto.userId,
        status: 'ACTIVE'
      }
    });

    if (existingSession) {
      throw new BadRequestException('该用户已有活动的托管会话，请先停止现有会话');
    }

    // 创建托管会话
    const session = await this.prisma.tradingSession.create({
      data: {
        userId: dto.userId,
        userName: user.displayName,
        cycleIntervalSec: dto.cycleIntervalSec,
        assetType: dto.assetType,
        accountType: dto.accountType || 'DEMO',
        createdById: adminId,
        createdByName: adminName,
        status: 'ACTIVE'
      }
    });

    // 创建第一个交易周期
    await this.createNextCycle(session.id);

    this.logger.log(`交易托管会话已创建: ${session.id}, 用户: ${user.displayName}`);

    return session;
  }

  /**
   * 停止交易托管会话
   */
  async stopSession(sessionId: string) {
    const session = await this.prisma.tradingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException('托管会话不存在');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('只能停止活动中的托管会话');
    }

    // 停止会话
    const updatedSession = await this.prisma.tradingSession.update({
      where: { id: sessionId },
      data: {
        status: 'STOPPED',
        stoppedAt: new Date()
      }
    });

    // 停止所有未完成的周期
    await this.prisma.tradingCycle.updateMany({
      where: {
        tradingSessionId: sessionId,
        status: { in: ['PENDING', 'RUNNING'] }
      },
      data: {
        status: 'FAILED'
      }
    });

    this.logger.log(`交易托管会话已停止: ${sessionId}`);

    return updatedSession;
  }

  /**
   * 暂停交易托管会话
   */
  async pauseSession(sessionId: string) {
    const session = await this.prisma.tradingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException('托管会话不存在');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('只能暂停活动中的托管会话');
    }

    const updatedSession = await this.prisma.tradingSession.update({
      where: { id: sessionId },
      data: { status: 'PAUSED' }
    });

    this.logger.log(`交易托管会话已暂停: ${sessionId}`);

    return updatedSession;
  }

  /**
   * 恢复交易托管会话
   */
  async resumeSession(sessionId: string) {
    const session = await this.prisma.tradingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException('托管会话不存在');
    }

    if (session.status !== 'PAUSED') {
      throw new BadRequestException('只能恢复已暂停的托管会话');
    }

    const updatedSession = await this.prisma.tradingSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE' }
    });

    this.logger.log(`交易托管会话已恢复: ${sessionId}`);

    return updatedSession;
  }

  /**
   * 查询托管会话列表
   */
  async findAllSessions(dto: QueryTradingSessionsDto) {
    const { page = 1, pageSize = 10, userId, status, assetType, accountType } = dto;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (assetType) where.assetType = assetType;
    if (accountType) where.accountType = accountType;

    const [data, total] = await Promise.all([
      this.prisma.tradingSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          tradingCycles: {
            orderBy: { cycleNumber: 'desc' },
            take: 1 // 只取最新的一个周期
          }
        }
      }),
      this.prisma.tradingSession.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 获取单个托管会话详情
   */
  async findOneSession(sessionId: string) {
    const session = await this.prisma.tradingSession.findUnique({
      where: { id: sessionId },
      include: {
        tradingCycles: {
          orderBy: { cycleNumber: 'desc' },
          take: 10 // 获取最近10个周期
        }
      }
    });

    if (!session) {
      throw new NotFoundException('托管会话不存在');
    }

    return session;
  }

  /**
   * 查询交易周期列表
   */
  async findAllCycles(dto: QueryTradingCyclesDto) {
    const { page = 1, pageSize = 10, tradingSessionId, status, assetType } = dto;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (tradingSessionId) where.tradingSessionId = tradingSessionId;
    if (status) where.status = status;
    if (assetType) where.assetType = assetType;

    const [data, total] = await Promise.all([
      this.prisma.tradingCycle.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: {
          tradingSession: {
            select: {
              userId: true,
              userName: true
            }
          },
          transactions: {
            select: {
              id: true,
              orderNumber: true,
              assetType: true,
              direction: true,
              investAmount: true,
              actualReturn: true,
              status: true
            }
          }
        }
      }),
      this.prisma.tradingCycle.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 创建下一个交易周期
   */
  private async createNextCycle(sessionId: string) {
    const session = await this.prisma.tradingSession.findUnique({
      where: { id: sessionId },
      include: {
        tradingCycles: {
          orderBy: { cycleNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!session) {
      this.logger.warn(`托管会话不存在: ${sessionId}`);
      return;
    }

    if (session.status !== 'ACTIVE') {
      this.logger.warn(`托管会话不是活动状态: ${sessionId}, 状态: ${session.status}`);
      return;
    }

    const cycleNumber = session.tradingCycles.length > 0
      ? session.tradingCycles[0].cycleNumber + 1
      : 1;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + session.cycleIntervalSec * 1000);

    // 获取当前市场价格作为周期开始价格
    const startPrice = await this.getCurrentPrice(session.assetType);

    const cycle = await this.prisma.tradingCycle.create({
      data: {
        tradingSessionId: sessionId,
        cycleNumber,
        assetType: session.assetType,
        startTime,
        endTime,
        durationSec: session.cycleIntervalSec,
        startPrice: startPrice ? new Decimal(startPrice) : null,
        status: 'RUNNING'
      }
    });

    this.logger.log(`交易周期已创建: ${cycle.id}, 会话: ${sessionId}, 周期号: ${cycleNumber}`);

    return cycle;
  }

  /**
   * 定时任务：处理交易周期
   * 每分钟执行一次，检查是否有到期的周期需要完成
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCycleCompletion() {
    const now = new Date();

    // 查找所有应该完成的周期（状态为RUNNING且结束时间已过）
    const completedCycles = await this.prisma.tradingCycle.findMany({
      where: {
        status: 'RUNNING',
        endTime: { lte: now }
      },
      include: {
        tradingSession: true
      }
    });

    for (const cycle of completedCycles) {
      try {
        // 获取周期结束价格
        const endPrice = await this.getCurrentPrice(cycle.assetType);

        // 更新周期状态
        await this.prisma.tradingCycle.update({
          where: { id: cycle.id },
          data: {
            status: 'COMPLETED',
            endPrice: endPrice ? new Decimal(endPrice) : null
          }
        });

        this.logger.log(`交易周期已完成: ${cycle.id}, 开始价格: ${cycle.startPrice}, 结束价格: ${endPrice}`);

        // 如果托管会话还在活动中，创建下一个周期
        if (cycle.tradingSession.status === 'ACTIVE') {
          await this.createNextCycle(cycle.tradingSessionId);
        }
      } catch (error) {
        this.logger.error(`处理交易周期失败: ${cycle.id}`, error);

        // 标记周期为失败
        await this.prisma.tradingCycle.update({
          where: { id: cycle.id },
          data: { status: 'FAILED' }
        });
      }
    }
  }

  /**
   * 获取当前市场价格
   * TODO: 实现实际的市场数据获取逻辑
   */
  private async getCurrentPrice(assetType: string): Promise<number | null> {
    try {
      // 从市场快照表获取最新价格
      const snapshot = await this.prisma.marketSnapshot.findFirst({
        where: { symbol: assetType },
        orderBy: { createdAt: 'desc' }
      });

      if (snapshot) {
        return parseFloat(snapshot.price.toString());
      }

      // 如果没有找到快照，返回模拟价格（仅用于开发/测试）
      this.logger.warn(`未找到资产 ${assetType} 的市场快照，使用模拟价格`);

      // 简单的模拟价格生成
      const basePrices: Record<string, number> = {
        'BTC/USDT': 45000,
        'ETH/USDT': 2500,
        'BNB/USDT': 300
      };

      const basePrice = basePrices[assetType] || 1000;
      // 添加 ±5% 的随机波动
      const fluctuation = (Math.random() - 0.5) * 0.1 * basePrice;
      return basePrice + fluctuation;
    } catch (error) {
      this.logger.error(`获取价格失败: ${assetType}`, error);
      return null;
    }
  }

  /**
   * 标记托管期间的交易
   * 当创建交易流水时，检查用户是否处于托管状态，如果是则标记 isManaged=true
   */
  async markManagedTransaction(userId: string, transactionId: string): Promise<void> {
    // 查找用户当前是否有活动的托管会话
    const activeSession = await this.prisma.tradingSession.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        tradingCycles: {
          where: { status: 'RUNNING' },
          orderBy: { startTime: 'desc' },
          take: 1
        }
      }
    });

    if (activeSession && activeSession.tradingCycles.length > 0) {
      const currentCycle = activeSession.tradingCycles[0];

      // 更新交易流水，标记为托管交易
      await this.prisma.transactionLog.update({
        where: { id: transactionId },
        data: {
          isManaged: true,
          tradingCycleId: currentCycle.id
        }
      });

      // 更新周期的交易计数
      await this.prisma.tradingCycle.update({
        where: { id: currentCycle.id },
        data: {
          transactionCount: { increment: 1 }
        }
      });

      this.logger.log(`交易 ${transactionId} 已标记为托管交易，关联周期: ${currentCycle.id}`);
    }
  }

  /**
   * 删除托管会话
   */
  async deleteSession(sessionId: string) {
    const session = await this.prisma.tradingSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException('托管会话不存在');
    }

    // 删除会话（级联删除相关周期和交易记录的关联）
    await this.prisma.tradingSession.delete({
      where: { id: sessionId }
    });

    this.logger.log(`交易托管会话已删除: ${sessionId}`);

    return { message: '托管会话已删除' };
  }
}
