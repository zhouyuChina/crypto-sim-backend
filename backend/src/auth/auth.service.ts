import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';

import { EmailVerificationType } from '../email/dto/send-verification-code.dto';
import { EmailVerificationService } from '../email/email-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UserEntity } from './entities/user.entity';
import type { Role } from '../common/decorators/roles.decorator';
import { generateUniqueUserId } from '../common/utils/user-id.generator';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailVerificationService: EmailVerificationService
  ) {
    this.saltRounds = this.configService.get<number>('auth.bcryptSaltRounds') ?? 12;
  }

  async register(payload: RegisterDto): Promise<{ user: UserEntity }> {
    // 先校验邮箱是否被占用，避免消耗验证码
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 校验邮箱验证码（通过后会把该验证码标记为已使用）
    await this.emailVerificationService.verifyCode(
      payload.email,
      payload.verificationCode,
      EmailVerificationType.REGISTER
    );

    // 手机号不需要唯一性验证，允许多个用户使用相同手机号

    const passwordHash = await this.hashValue(payload.password);
    const id = await generateUniqueUserId(this.prisma);
    const user = await this.prisma.user.create({
      data: {
        id,
        email: payload.email,
        displayName: payload.displayName,
        phoneNumber: payload.phoneNumber ?? null,  // 注册时手机号可选
        passwordHash,
        avatar: payload.avatar,  // 保存头像 URL
        roles: payload.roles ?? ['trader']
      }
    });

    return {
      user: this.sanitizeUser(user),
    };
  }

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    const passwordMatches = await this.compareValue(password, user.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async login(user: UserEntity, ip?: string): Promise<{ user: UserEntity; tokens: AuthTokens }> {
    const dbUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip || null
      }
    });
    const tokens = await this.generateAndPersistTokens(dbUser);
    return {
      user: this.sanitizeUser(dbUser),
      tokens
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.configService.get<string>('auth.jwt.refreshTokenSecret')
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException();
      }

      const isMatch = await this.compareValue(refreshToken, user.refreshTokenHash);
      if (!isMatch) {
        throw new UnauthorizedException();
      }

      const tokens = await this.generateAndPersistTokens(user);
      return tokens;
    } catch (error) {
      this.logger.warn('Failed to refresh token', error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException();
    }
  }

  async revokeTokens(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null }
    });
  }

  async uploadIdCard(
    userId: string,
    type: 'front' | 'back' | 'passport',
    fileUrl: string,
    currentVerificationStatus: string,
  ): Promise<UserEntity> {
    const updateData = type === 'front'
      ? { idCardFront: fileUrl, documentType: 'id_card' }
      : type === 'back'
        ? { idCardBack: fileUrl, documentType: 'id_card' }
        : { passportPhoto: fileUrl, documentType: 'passport' };

    if (currentVerificationStatus !== 'VERIFIED') {
      Object.assign(updateData, { verificationStatus: 'IN_REVIEW' });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData
    });

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
      accountBalance: Number(safeUser.accountBalance),
      demoBalance: Number(safeUser.demoBalance),
      realBalance: Number(safeUser.realBalance),
      totalProfitLoss: Number(safeUser.totalProfitLoss),
      winRate: Number(safeUser.winRate),
      idCardFront: safeUser.idCardFront ?? null,
      idCardBack: safeUser.idCardBack ?? null,
      passportPhoto: safeUser.passportPhoto ?? null,
      documentType: safeUser.documentType ?? null,
    } as UserEntity;
  }

  private async generateAndPersistTokens(user: User): Promise<AuthTokens> {
    const roles = this.normalizeRoles(user.roles);
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, roles },
      {
        expiresIn: this.configService.get<string>('auth.jwt.accessTokenTtl'),
        secret: this.configService.get<string>('auth.jwt.accessTokenSecret')
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        expiresIn: this.configService.get<string>('auth.jwt.refreshTokenTtl'),
        secret: this.configService.get<string>('auth.jwt.refreshTokenSecret')
      }
    );

    const refreshTokenHash = await this.hashValue(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash }
    });

    return { accessToken, refreshToken };
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

  private async hashValue(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }

  private async compareValue(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }

  /**
   * 用户更新手机号
   * 手机号不需要唯一性，允许多个用户使用相同手机号
   */
  async updatePhoneNumber(userId: string, phoneNumber: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * 用户更新个人资料
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: updateProfileDto.displayName ?? user.displayName,
        phoneNumber: updateProfileDto.phoneNumber ?? user.phoneNumber,
        avatar: updateProfileDto.avatar ?? user.avatar,
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * 用户修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await this.compareValue(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('旧密码不正确');
    }

    // 更新为新密码
    const newPasswordHash = await this.hashValue(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`用户 ${userId} 修改密码成功`);
  }

  /**
   * 用户上传头像
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 更新头像
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    this.logger.log(`用户 ${userId} 上传头像成功: ${avatarUrl}`);

    return this.sanitizeUser(updatedUser);
  }
}
