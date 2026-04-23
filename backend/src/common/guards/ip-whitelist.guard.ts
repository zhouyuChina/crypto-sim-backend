import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import * as ipaddr from 'ipaddr.js';

import { SettingsService } from '../../settings/settings.service';

interface IpWhitelistConfig {
  ips: string[];
  enabled: boolean;
  description?: string;
}

const CACHE_TTL_MS = 5000;
const ADMIN_PATH_PATTERN = /^\/(?:api\/)?admin(?:\/|$)/;

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);
  private cache: { value: IpWhitelistConfig; expiresAt: number } | null = null;

  constructor(private readonly settingsService: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path || request.url || '';

    if (!ADMIN_PATH_PATTERN.test(path)) {
      return true;
    }

    const config = await this.getCachedConfig();
    if (!config.enabled || !config.ips?.length) {
      return true;
    }

    const clientIp = this.getClientIp(request);
    if (!clientIp) {
      this.logger.warn(`IP 白名单: 无法识别客户端 IP (path=${path})`);
      throw new ForbiddenException('无法识别客户端 IP');
    }

    // 环回地址始终放行，避免本机误锁
    if (clientIp === '127.0.0.1' || clientIp === '::1') {
      return true;
    }

    if (this.matchAny(clientIp, config.ips)) {
      return true;
    }

    this.logger.warn(`IP 白名单拦截: ip=${clientIp} path=${path}`);
    throw new ForbiddenException('您的 IP 不在访问白名单中');
  }

  private async getCachedConfig(): Promise<IpWhitelistConfig> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }
    const config = await this.settingsService.getIpWhitelist();
    this.cache = { value: config, expiresAt: now + CACHE_TTL_MS };
    return config;
  }

  private getClientIp(req: Request): string | null {
    const raw = req.ip;
    if (!raw) return null;
    // 兼容 IPv4-mapped IPv6 (::ffff:1.2.3.4)
    return raw.replace(/^::ffff:/, '');
  }

  private matchAny(ip: string, rules: string[]): boolean {
    let addr: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      addr = ipaddr.parse(ip);
    } catch {
      return false;
    }
    for (const rule of rules) {
      const trimmed = rule.trim();
      if (!trimmed) continue;
      try {
        if (trimmed.includes('/')) {
          const range = ipaddr.parseCIDR(trimmed);
          if (addr.kind() === range[0].kind() && addr.match(range)) {
            return true;
          }
        } else {
          const single = ipaddr.parse(trimmed);
          if (
            addr.kind() === single.kind() &&
            addr.toNormalizedString() === single.toNormalizedString()
          ) {
            return true;
          }
        }
      } catch {
        continue;
      }
    }
    return false;
  }
}
