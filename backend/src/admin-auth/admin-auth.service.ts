import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminsDto, SortOrder } from './dto/query-admins.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: AdminLoginDto, ip?: string) {
    const { username, password } = loginDto;

    // 查找管理员
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('账户已被停用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 JWT tokens
    const payload = {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      type: 'admin', // 标记为管理员
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>('auth.jwt.accessTokenTtl'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwt.refreshTokenSecret'),
      expiresIn: this.configService.get<string>('auth.jwt.refreshTokenTtl'),
    });

    // 保存 refresh token hash 和登录信息
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
        lastLoginIp: ip || null, // 记录管理员登录 IP
      },
    });

    // 返回数据（不包含敏感信息）
    const { passwordHash, refreshTokenHash: _, ...adminData } = admin;

    return {
      admin: adminData,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async logout(adminId: string) {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { refreshTokenHash: null },
    });

    return { message: '登出成功' };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // 验证 refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('auth.jwt.refreshTokenSecret'),
      });

      // 查找管理员
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
      });

      if (!admin || !admin.isActive || !admin.refreshTokenHash) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 验证 refresh token hash
      const isValid = await bcrypt.compare(refreshToken, admin.refreshTokenHash);
      if (!isValid) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 生成新的 tokens
      const tokenPayload = {
        sub: admin.id,
        username: admin.username,
        email: admin.email,
        type: 'admin',
      };

      const accessToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.get<string>('auth.jwt.accessTokenSecret'),
        expiresIn: this.configService.get<string>('auth.jwt.accessTokenTtl'),
      });

      const newRefreshToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.get<string>('auth.jwt.refreshTokenSecret'),
        expiresIn: this.configService.get<string>('auth.jwt.refreshTokenTtl'),
      });

      // 更新 refresh token hash
      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('刷新令牌失败');
    }
  }

  async validateAdmin(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('无效的管理员账户');
    }

    return admin;
  }

  // ==================== 管理员管理接口 ====================

  /**
   * 获取所有管理员列表
   */
  /**
   * 分页查询管理员列表
   * 支持：关键字搜索（username / email / displayName）、按字段排序、启用状态筛选
   */
  async findAllAdmins(query: QueryAdminsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? SortOrder.DESC;

    const where: Prisma.AdminWhereInput = {};

    if (query.search?.trim()) {
      const keyword = query.search.trim();
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
        { displayName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [admins, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          permissions: true,
          isActive: true,
          lastLoginAt: true,
          lastLoginIp: true,
          remark: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.admin.count({ where }),
    ]);

    return {
      data: admins,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取单个管理员详情
   */
  async getAdminById(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }

    return admin;
  }

  /**
   * 创建新管理员
   */
  async createAdmin(createAdminDto: CreateAdminDto) {
    const { username, email, password, displayName, permissions, remark } = createAdminDto;

    // 检查用户名是否已存在
    const existingUsername = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('邮箱已存在');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 12);

    // 创建管理员
    const admin = await this.prisma.admin.create({
      data: {
        username,
        email,
        passwordHash,
        displayName: displayName || username,
        permissions: permissions || ['*'], // 默认为超级管理员
        isActive: true,
        remark: remark?.trim() || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        permissions: true,
        isActive: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return admin;
  }

  /**
   * 更新管理员信息
   */
  async updateAdmin(id: string, updateAdminDto: UpdateAdminDto) {
    // 检查管理员是否存在
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      throw new NotFoundException('管理员不存在');
    }

    const { username, email, password, displayName, isActive, permissions, remark } = updateAdminDto;

    // 如果更新用户名，检查是否冲突
    if (username && username !== existingAdmin.username) {
      const usernameExists = await this.prisma.admin.findUnique({
        where: { username },
      });

      if (usernameExists) {
        throw new ConflictException('用户名已存在');
      }
    }

    // 如果更新邮箱，检查是否冲突
    if (email && email !== existingAdmin.email) {
      const emailExists = await this.prisma.admin.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new ConflictException('邮箱已存在');
      }
    }

    // 准备更新数据
    const updateData: any = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (displayName) updateData.displayName = displayName;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (permissions) updateData.permissions = permissions;
    if (remark !== undefined) updateData.remark = remark.trim() || null;

    // 如果更新密码，需要加密
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    // 更新管理员
    const admin = await this.prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        remark: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return admin;
  }

  /**
   * 删除管理员
   */
  async deleteAdmin(id: string) {
    // 检查管理员是否存在
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      throw new NotFoundException('管理员不存在');
    }

    // 检查是否是最后一个管理员
    const adminCount = await this.prisma.admin.count({
      where: { isActive: true },
    });

    if (adminCount <= 1) {
      throw new BadRequestException('无法删除最后一个管理员账户');
    }

    // 删除管理员
    await this.prisma.admin.delete({
      where: { id },
    });

    return { message: '管理员删除成功' };
  }
}
