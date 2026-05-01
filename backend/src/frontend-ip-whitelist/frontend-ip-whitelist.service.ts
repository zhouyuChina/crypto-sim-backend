import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import * as net from 'net';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

import {
  FrontendIpWhitelistResponseDto,
  UpdateFrontendIpWhitelistDto,
} from './dto/update-frontend-ip-whitelist.dto';

const execAsync = promisify(exec);

const SETTING_KEY = 'frontend.ipWhitelist';
const SETTING_CATEGORY = 'frontend';

interface StoredValue {
  enabled: boolean;
  ips: string[];
}

@Injectable()
export class FrontendIpWhitelistService {
  private readonly logger = new Logger(FrontendIpWhitelistService.name);
  private readonly confPath: string;
  private readonly reloadCmd: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.confPath = this.configService.get<string>('frontendIpWhitelist.confPath')!;
    this.reloadCmd = this.configService.get<string>('frontendIpWhitelist.reloadCmd')!;
  }

  async findOne(): Promise<FrontendIpWhitelistResponseDto> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: SETTING_KEY },
    });
    const value = (setting?.value as Partial<StoredValue> | null) ?? null;

    return {
      enabled: value?.enabled ?? false,
      ips: Array.isArray(value?.ips) ? value!.ips : [],
      confPath: this.confPath,
      updatedAt: setting?.updatedAt,
    };
  }

  async update(dto: UpdateFrontendIpWhitelistDto): Promise<FrontendIpWhitelistResponseDto> {
    const cleaned = this.normalizeIps(dto.ips);
    if (dto.enabled && cleaned.length === 0) {
      throw new BadRequestException('启用白名单时，IP 列表不能为空');
    }

    const value: StoredValue = { enabled: dto.enabled, ips: cleaned };

    const saved = await this.prisma.systemSettings.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        category: SETTING_CATEGORY,
        description: '前端站点 nginx 层 IP 白名单',
        value: value as any,
      },
      update: { value: value as any },
    });

    await this.writeNginxConf(value);
    await this.reloadNginx();

    this.logger.log(
      `前端 IP 白名单已更新: enabled=${value.enabled}, count=${value.ips.length}`,
    );

    return {
      enabled: value.enabled,
      ips: value.ips,
      confPath: this.confPath,
      updatedAt: saved.updatedAt,
    };
  }

  private normalizeIps(rawIps: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of rawIps) {
      const trimmed = (raw ?? '').trim();
      if (!trimmed || seen.has(trimmed)) continue;
      if (!this.isValidIpOrCidr(trimmed)) {
        throw new BadRequestException(`非法 IP 或网段: ${trimmed}`);
      }
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  }

  private isValidIpOrCidr(value: string): boolean {
    const [ip, cidr] = value.split('/');
    if (!ip || !net.isIP(ip)) return false;
    if (cidr === undefined) return true;
    const n = Number(cidr);
    if (!Number.isInteger(n) || n < 0) return false;
    return net.isIP(ip) === 4 ? n <= 32 : n <= 128;
  }

  private async writeNginxConf(value: StoredValue): Promise<void> {
    let content: string;
    if (!value.enabled || value.ips.length === 0) {
      content = '# IP 白名单未启用\n';
    } else {
      const lines = value.ips.map((ip) => `allow ${ip};`);
      lines.push('deny all;');
      content = `# 由后台 API 自动生成，请勿手动修改\n${lines.join('\n')}\n`;
    }

    try {
      await fs.writeFile(this.confPath, content, { encoding: 'utf-8' });
    } catch (e) {
      this.logger.error(
        `写入 nginx 配置失败: path=${this.confPath}`,
        (e as Error).stack,
      );
      throw new InternalServerErrorException('写入 nginx 配置文件失败，请检查后端进程权限');
    }
  }

  private async reloadNginx(): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync(this.reloadCmd, { timeout: 5000 });
      if (stdout) this.logger.debug(`nginx reload stdout: ${stdout.trim()}`);
      if (stderr) this.logger.debug(`nginx reload stderr: ${stderr.trim()}`);
    } catch (e) {
      this.logger.error(
        `重载 nginx 失败: cmd=${this.reloadCmd}`,
        (e as Error).stack,
      );
      throw new InternalServerErrorException(
        '重载 nginx 失败，请检查 sudoers 配置或确认 nginx 路径',
      );
    }
  }
}
