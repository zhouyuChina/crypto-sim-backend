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
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwt.refreshTokenSecret')
    });
  }

  async validate(payload: { sub: string }): Promise<UserEntity> {
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
