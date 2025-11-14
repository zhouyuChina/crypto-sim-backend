import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { CycleStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MarketSessionService } from './market-session.service';

@Injectable()
export class SubMarketCycleWatcherService {
  private readonly logger = new Logger(SubMarketCycleWatcherService.name);
  private processing = false;
  private readonly processingCycles = new Set<string>();
  private readonly MAX_BATCH = 20;
  private readonly STALE_THRESHOLD_MS = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketSessionService: MarketSessionService,
  ) {}

  /**
   * 定时扫描已到期的小盘周期，触发自动结算
   */
  @Interval(1000)
  async handleDueCycles() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      const dueCycles = await this.prisma.subMarketCycle.findMany({
        where: {
          status: CycleStatus.RUNNING,
          endTime: { lte: new Date() },
        },
        select: { id: true },
        orderBy: { endTime: 'asc' },
        take: this.MAX_BATCH,
      });

      for (const cycle of dueCycles) {
        if (this.processingCycles.has(cycle.id)) {
          continue;
        }
        this.processingCycles.add(cycle.id);

        try {
          await this.marketSessionService.completeCycle(cycle.id);
        } catch (error) {
          this.logger.error(
            `自动结算小盘周期失败: ${cycle.id}`,
            (error as Error).stack,
          );
        } finally {
          this.processingCycles.delete(cycle.id);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * 定期扫描超时未结算的周期，触发补偿逻辑
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async reconcileStalledCycles() {
    if (this.processing) {
      return;
    }

    const cutoff = new Date(Date.now() - this.STALE_THRESHOLD_MS);
    const stalledCycles = await this.prisma.subMarketCycle.findMany({
      where: {
        status: CycleStatus.RUNNING,
        endTime: { lt: cutoff },
      },
      select: { id: true, endTime: true },
      take: this.MAX_BATCH,
    });

    if (stalledCycles.length === 0) {
      return;
    }

    this.logger.warn(
      `检测到 ${stalledCycles.length} 个超过 ${this.STALE_THRESHOLD_MS / 1000}s 的未结算周期，尝试补偿`,
    );

    for (const cycle of stalledCycles) {
      if (this.processingCycles.has(cycle.id)) {
        continue;
      }

      this.processingCycles.add(cycle.id);
      try {
        await this.marketSessionService.completeCycle(cycle.id);
      } catch (error) {
        this.logger.error(
          `补偿结算失败: ${cycle.id}`,
          (error as Error).stack,
        );
      } finally {
        this.processingCycles.delete(cycle.id);
      }
    }
  }
}
