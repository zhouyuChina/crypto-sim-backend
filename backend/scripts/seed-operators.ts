import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function seedOperators() {
  console.log('开始创建操作员 mock 数据...\n');

  // 操作员数据
  const operators = [
    {
      email: 'zhangsan@operators.com',
      displayName: '张三',
      phoneNumber: '+86-13800138001',
      demoBalance: 50000,
      realBalance: 125000,
      totalProfitLoss: 12500.50,
      totalTrades: 156,
      winRate: 65.5,
    },
    {
      email: 'lisi@operators.com',
      displayName: '李四',
      phoneNumber: '+86-13800138002',
      demoBalance: 35000,
      realBalance: 98000,
      totalProfitLoss: 8750.25,
      totalTrades: 89,
      winRate: 58.2,
    },
    {
      email: 'wangwu@operators.com',
      displayName: '王五',
      phoneNumber: '+86-13800138003',
      demoBalance: 20000,
      realBalance: 45000,
      totalProfitLoss: -3450.75,
      totalTrades: 234,
      winRate: 42.8,
    },
    {
      email: 'zhaoliu@operators.com',
      displayName: '赵六',
      phoneNumber: '+86-13800138004',
      demoBalance: 75000,
      realBalance: 200000,
      totalProfitLoss: 18900.00,
      totalTrades: 312,
      winRate: 72.3,
    },
    {
      email: 'sunqi@operators.com',
      displayName: '孙七',
      phoneNumber: '+86-13800138005',
      demoBalance: 28000,
      realBalance: 72000,
      totalProfitLoss: 5230.80,
      totalTrades: 67,
      winRate: 55.2,
    },
    {
      email: 'zhouba@operators.com',
      displayName: '周八',
      phoneNumber: '+86-13800138006',
      demoBalance: 42000,
      realBalance: 110000,
      totalProfitLoss: 15600.30,
      totalTrades: 198,
      winRate: 68.7,
    },
    {
      email: 'wujiu@operators.com',
      displayName: '吴九',
      phoneNumber: '+86-13800138007',
      demoBalance: 38000,
      realBalance: 85000,
      totalProfitLoss: -1200.50,
      totalTrades: 145,
      winRate: 48.3,
    },
    {
      email: 'zhengshi@operators.com',
      displayName: '郑十',
      phoneNumber: '+86-13800138008',
      demoBalance: 55000,
      realBalance: 142000,
      totalProfitLoss: 22300.75,
      totalTrades: 276,
      winRate: 70.1,
    },
  ];

  // 获取系统管理员 ID（用于 createdBy 字段）
  const admin = await prisma.admin.findFirst({
    where: { username: 'admin' },
  });

  if (!admin) {
    console.error('错误: 未找到系统管理员账户，请先创建管理员');
    return;
  }

  console.log(`使用管理员 ID: ${admin.id}\n`);

  // 创建操作员
  for (const operatorData of operators) {
    // 检查是否已存在
    const existing = await prisma.user.findUnique({
      where: { email: operatorData.email },
    });

    if (existing) {
      console.log(`⚠️  操作员 ${operatorData.displayName} (${operatorData.email}) 已存在，跳过`);
      continue;
    }

    // 生成随机密码哈希（操作员不需要登录）
    const passwordHash = await bcrypt.hash(`operator_${uuidv4()}`, 12);

    const operator = await prisma.user.create({
      data: {
        email: operatorData.email,
        displayName: operatorData.displayName,
        phoneNumber: operatorData.phoneNumber,
        passwordHash,
        roles: ['trader'], // 给予交易员角色
        isActive: true,
        isCustomMember: true, // 标记为操作员
        createdBy: admin.id, // 记录创建者
        demoBalance: operatorData.demoBalance,
        realBalance: operatorData.realBalance,
        accountBalance: operatorData.realBalance, // 默认显示真实余额
        totalProfitLoss: operatorData.totalProfitLoss,
        totalTrades: operatorData.totalTrades,
        winRate: operatorData.winRate,
        verificationStatus: 'VERIFIED', // 已验证
      },
    });

    console.log(`✓ 创建操作员: ${operator.displayName} (${operator.email})`);
    console.log(`  - ID: ${operator.id}`);
    console.log(`  - 真实余额: $${operator.realBalance}`);
    console.log(`  - 总收益: $${operator.totalProfitLoss}`);
    console.log(`  - 交易次数: ${operator.totalTrades}`);
    console.log(`  - 胜率: ${operator.winRate}%\n`);
  }

  console.log('✅ 操作员 mock 数据创建完成！');
  console.log(`共创建 ${operators.length} 个操作员账户\n`);
}

seedOperators()
  .catch((e) => {
    console.error('创建操作员失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
