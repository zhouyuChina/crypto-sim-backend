import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketSessionDto } from './dto/create-market-session.dto';
import { UpdateMarketSessionDto } from './dto/update-market-session.dto';
import { GetMarketSessionsDto } from './dto/get-market-sessions.dto';
import { TradeTypeRuleDto } from './dto/trade-type-rule.dto';

@Injectable()
export class MarketSessionService {
  private readonly logger = new Logger(MarketSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // 更新大盘状态为 ACTIVE
    const updatedSession = await this.prisma.marketSession.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });

    this.logger.log(`大盘已开启: ${id}`);

    return {
      marketSession: updatedSession,
    };
  }

  /**
   * 关闭大盘
   */
  async stop(id: string) {
    const marketSession = await this.prisma.marketSession.findUnique({
      where: { id },
    });

    if (!marketSession) {
      throw new NotFoundException('大盘不存在');
    }

    if (marketSession.status !== 'ACTIVE') {
      throw new BadRequestException('大盘未在运行中');
    }

    // 更新大盘状态为 COMPLETED
    const updatedSession = await this.prisma.marketSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
      },
    });

    this.logger.log(`大盘已关闭: ${id}`);

    return {
      message: '大盘已关闭',
      marketSession: updatedSession,
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
      orderBy: { startTime: 'desc' },
    });

    return marketSessions;
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
