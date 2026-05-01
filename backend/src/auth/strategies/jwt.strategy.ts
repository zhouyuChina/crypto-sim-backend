import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import type { UserEntity } from '../entities/user.entity';
import type { Role } from '../../common/decorators/roles.decorator';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwt.accessTokenSecret')
    });
  }

  async validate(payload: { sub: string; type?: string }): Promise<UserEntity> {
    // 如果是管理员，从 Admin 表查找
    if (payload.type === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub }
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException();
      }

      // 返回管理员用户对象，角色为 admin
      return {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        roles: ['admin'] as Role[],
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt ?? null,
        lastLoginIp: admin.lastLoginIp ?? null,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        phoneNumber: null,
        accountBalance: 0,
        demoBalance: 0,
        realBalance: 0,
        totalProfitLoss: 0,
        winRate: 0,
        totalTrades: 0,
        verificationStatus: 'VERIFIED' as const,
        tradeDurations: UserResponseDto.normalizeTradeDurations(null),
      };
    }

    // 普通用户，从 User 表查找
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User): UserEntity {
    const { passwordHash, refreshTokenHash, roles, ...safeUser } = user;
    return {
      ...safeUser,
      roles: this.normalizeRoles(roles),
      lastLoginAt: safeUser.lastLoginAt ?? null,
      lastLoginIp: safeUser.lastLoginIp ?? null,
      phoneNumber: safeUser.phoneNumber,
      // 转换 Decimal 类型为 number
      accountBalance: Number(safeUser.accountBalance),
      demoBalance: Number(safeUser.demoBalance),
      realBalance: Number(safeUser.realBalance),
      totalProfitLoss: Number(safeUser.totalProfitLoss),
      winRate: Number(safeUser.winRate),
      totalTrades: safeUser.totalTrades,
      verificationStatus: safeUser.verificationStatus,
      tradeDurations: UserResponseDto.normalizeTradeDurations((safeUser as any).tradeDurations),
    };
  }

  private normalizeRoles(value: unknown): Role[] {
    if (Array.isArray(value)) {
      return value as Role[];
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as Role[]) : ['trader'];
      } catch {
        return ['trader'];
      }
    }

    return ['trader'];
  }
}
