import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { generateUniqueUserId } from '../src/common/utils/user-id.generator';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

  // ==================== 创建管理员账户 (Admin 表) ====================
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@crypto-sim.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const adminDisplayName = process.env.SEED_ADMIN_DISPLAY_NAME ?? '系统管理员';

  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);

  const admin = await prisma.admin.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminPasswordHash,
      email: adminEmail,
      displayName: adminDisplayName,
      isActive: true,
      permissions: ['*'], // 超级管理员权限
    },
    create: {
      username: adminUsername,
      email: adminEmail,
      displayName: adminDisplayName,
      passwordHash: adminPasswordHash,
      permissions: ['*'], // 超级管理员权限
      isActive: true,
    },
  });

  console.log('✅ 管理员账户已创建/更新:');
  console.log('   用户名:', admin.username);
  console.log('   邮箱:', admin.email);
  console.log('   密码:', adminPassword);
  console.log('');

  // ==================== 创建测试用户 (User 表) ====================
  const userEmail = process.env.SEED_USER_EMAIL ?? 'test@example.com';
  const userPassword = process.env.SEED_USER_PASSWORD ?? 'test123';
  const userPhone = process.env.SEED_USER_PHONE ?? '+86-13800138000';

  const userPasswordHash = await bcrypt.hash(userPassword, saltRounds);

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      passwordHash: userPasswordHash,
      roles: ['trader'],
      isActive: true,
    },
    create: {
      id: await generateUniqueUserId(prisma),
      email: userEmail,
      displayName: '测试用户',
      phoneNumber: userPhone,
      passwordHash: userPasswordHash,
      roles: ['trader'],
      isActive: true,
    },
  });

  console.log('✅ 测试用户已创建/更新:');
  console.log('   邮箱:', user.email);
  console.log('   密码:', userPassword);
  console.log('');

  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          name: '张伟',
          title: '资深交易员',
          rating: 5,
          content: '平台的模拟环境非常接近真实市场，让我可以放心测试策略并持续优化表现。'
        },
        {
          name: '李静',
          title: '量化研究员',
          rating: 4,
          content: '数据同步稳定、界面清晰，是团队日常打磨交易模型的重要工具。'
        },
        {
          name: '王强',
          title: '风控经理',
          rating: 5,
          content: '系统提供的复盘和实时监测功能帮助我们快速发现问题，效率大幅提升。'
        }
      ]
    });
  }

  const carouselCount = await prisma.carouselItem.count();
  if (carouselCount === 0) {
    await prisma.carouselItem.createMany({
      data: [
        {
          sortOrder: 1,
          content: '欢迎来到加密货币模拟平台，先从新手指南开始体验吧！'
        },
        {
          sortOrder: 2,
          content: '每日更新市场资讯，关注排行榜掌握顶尖交易策略。'
        },
        {
          sortOrder: 3,
          content: '开启模拟交易挑战赛，赢取专属徽章和奖励。'
        }
      ]
    });
  }

  const leaderboardCount = await prisma.leaderboardEntry.count();
  if (leaderboardCount === 0) {
    await prisma.leaderboardEntry.createMany({
      data: [
        {
          type: 'DAILY',
          avatar: 'https://example.com/avatars/user1.png',
          country: '中国',
          name: '陈睿',
          tradeCount: 48,
          winRate: 78.5,
          volume: 152345.67
        },
        {
          type: 'WEEKLY',
          avatar: 'https://example.com/avatars/user2.png',
          country: '新加坡',
          name: 'Grace Lee',
          tradeCount: 215,
          winRate: 71.2,
          volume: 982345.12
        },
        {
          type: 'MONTHLY',
          avatar: 'https://example.com/avatars/user3.png',
          country: '美国',
          name: 'Michael Chen',
          tradeCount: 845,
          winRate: 68.9,
          volume: 3156789.45
        }
      ]
    });
  }

  const performanceCount = await prisma.tradingPerformance.count();
  if (performanceCount === 0) {
    await prisma.tradingPerformance.createMany({
      data: [
        {
          tradeDuration: 5,
          winRate: 72.5
        },
        {
          tradeDuration: 15,
          winRate: 68.2
        },
        {
          tradeDuration: 60,
          winRate: 63.4
        }
      ]
    });
    console.log('✅ 交易配置已创建: 3 条记录');
  }

  // ==================== 数据库初始化完成 ====================
  console.log('');
  console.log('🎉 数据库初始化完成！');
  console.log('');
  console.log('📋 登录信息:');
  console.log('   管理后台: http://localhost:3000/api/admin/auth/login');
  console.log('   - 用户名: ' + adminUsername);
  console.log('   - 密码: ' + adminPassword);
  console.log('');
  console.log('   客户端: http://localhost:3000/api/auth/login');
  console.log('   - 邮箱: ' + userEmail);
  console.log('   - 密码: ' + userPassword);
  console.log('');
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error('Failed to seed database', error);
    await prisma.$disconnect();
    process.exit(1);
  });
