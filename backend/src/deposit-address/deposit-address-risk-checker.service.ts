import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DepositAddressRisk, FundingNetwork } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

import { DepositAddressService } from './deposit-address.service';

const OKLINK_BASE = 'https://www.oklink.com/zh-hans/tron/address/';
const RISK_KEYWORD = '该地址被举报';
const REQUEST_TIMEOUT_MS = 10_000;
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

@Injectable()
export class DepositAddressRiskCheckerService {
  private readonly logger = new Logger(DepositAddressRiskCheckerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly depositAddressService: DepositAddressService
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'deposit-address-risk-check' })
  async runScheduled(): Promise<void> {
    const addresses = await this.prisma.depositAddress.findMany({
      where: { enabled: true, network: FundingNetwork.TRC20 },
      select: { id: true, address: true, network: true },
    });
    for (const a of addresses) {
      await this.checkOne(a.id, a.address, a.network).catch((err) => {
        this.logger.warn(
          `Risk check failed for ${a.address}: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'deposit-allocation-expire' })
  async releaseExpired(): Promise<void> {
    try {
      await this.depositAddressService.releaseExpiredAllocations();
    } catch (err) {
      this.logger.warn(
        `Release expired allocations failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * 单条立即检测，返回最新风险状态。可被管理端手动触发。
   */
  async checkOne(
    id: string,
    address: string,
    network: FundingNetwork = FundingNetwork.TRC20
  ): Promise<DepositAddressRisk> {
    if (network !== FundingNetwork.TRC20) {
      return DepositAddressRisk.UNKNOWN;
    }

    const url = `${OKLINK_BASE}${address}`;
    let body = '';
    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(url, {
          timeout: REQUEST_TIMEOUT_MS,
          headers: REQUEST_HEADERS,
          responseType: 'text',
          // 接收 4xx 仍然解析，避免把页面里的内容漏掉
          validateStatus: (s) => s < 500,
        })
      );
      body = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    } catch (err) {
      this.logger.warn(
        `oklink fetch failed for ${address}: ${err instanceof Error ? err.message : String(err)}`
      );
      return DepositAddressRisk.UNKNOWN;
    }

    const next = body.includes(RISK_KEYWORD)
      ? DepositAddressRisk.RISKY
      : DepositAddressRisk.SAFE;

    await this.prisma.depositAddress.update({
      where: { id },
      data: { riskStatus: next, lastRiskCheckAt: new Date() },
    });

    if (next === DepositAddressRisk.RISKY) {
      this.logger.warn(`Deposit address ${address} marked RISKY by oklink`);
    }
    return next;
  }
}
