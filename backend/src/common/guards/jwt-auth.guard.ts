import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Role } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    // 开发模式：跳过 JWT 验证
    // 生产环境务必设置 AUTH_SKIP_JWT_VERIFICATION=false
    const skipJwtVerification = this.configService.get<boolean>('auth.skipJwtVerification');
    if (skipJwtVerification) {
      // 在开发模式下，如果没有提供 token，注入一个默认用户
      const request = context.switchToHttp().getRequest();

      // 尝试从 header、query、body 中获取 userId
      const authHeader = request.headers.authorization;
      const queryUserId = request.query.userId;
      const bodyUserId = request.body?.userId;

      // 如果有 Authorization header，尝试正常解析
      // 注意：此处不捕获异常 —— 若 JWT 无效，应返回 401 而非 fallback 到假用户
      if (authHeader) {
        const result = await super.canActivate(context);
        if (result) {
          return true;
        }
      }

      // 使用提供的 userId 或默认的测试用户
      const userId = queryUserId || bodyUserId || '854135be-c8d9-4dc4-b18a-39ddbde4e8fd'; // test@example.com 的 ID

      // 从数据库加载用户的真实信息（包括角色）
      try {
        // 先尝试查找管理员
        const admin = await this.prisma.admin.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            displayName: true,
            isActive: true
          }
        });

        if (admin && admin.isActive) {
          // 注入管理员信息到 request，角色为 admin
          request.user = {
            id: admin.id,
            email: admin.email,
            displayName: admin.displayName,
            roles: ['admin'] as Role[],
            isActive: admin.isActive
          };

          return true;
        }

        // 如果不是管理员，查找普通用户
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            displayName: true,
            roles: true,
            isActive: true
          }
        });

        if (user) {
          // 标准化角色格式
          const normalizeRoles = (value: unknown): Role[] => {
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
          };

          // 注入用户信息到 request
          request.user = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            roles: normalizeRoles(user.roles),
            isActive: user.isActive
          };

          return true;
        }
      } catch (error) {
        // 如果数据库查询失败，使用默认用户
        console.warn('Failed to load user from database in dev mode:', error);
      }

      // 如果用户不存在或查询失败，使用默认用户
      request.user = {
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        roles: ['trader'],
        isActive: true
      };

      return true;
    }

    // 正常的 JWT 验证流程
    return super.canActivate(context) as Promise<boolean>;
  }
}
