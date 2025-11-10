import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOperatorTransactions() {
  console.log('开始创建操作员交易流水 mock 数据...\n');

  // 获取第一个操作员（张三）
  const operator1 = await prisma.user.findUnique({
    where: { email: 'zhangsan@operators.com' },
  });

  if (!operator1) {
    console.log('未找到操作员：张三');
    return;
  }

  console.log(`为操作员 ${operator1.displayName} 创建交易流水...`);

  // 为张三创建交易流水
  const transactions1 = [
    {
      userId: operator1.id,
      type: 'DEPOSIT' as const,
      amount: 100000,
      balanceAfter: 100000,
      description: '初始充值',
      status: 'COMPLETED' as const,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      userId: operator1.id,
      type: 'BUY' as const,
      symbol: 'BTCUSDT',
      amount: 1.5,
      price: 42000,
      total: 63000,
      balanceAfter: 37000,
      description: '买入 BTC',
      status: 'COMPLETED' as const,
      createdAt: new Date('2024-01-02T14:30:00Z'),
    },
    {
      userId: operator1.id,
      type: 'SELL' as const,
      symbol: 'BTCUSDT',
      amount: 1.5,
      price: 45000,
      total: 67500,
      balanceAfter: 104500,
      description: '卖出 BTC',
      status: 'COMPLETED' as const,
      createdAt: new Date('2024-01-03T09:15:00Z'),
    },
    {
      userId: operator1.id,
      type: 'BUY' as const,
      symbol: 'ETHUSDT',
      amount: 10,
      price: 2500,
      total: 25000,
      balanceAfter: 79500,
      description: '买入 ETH',
      status: 'COMPLETED' as const,
      createdAt: new Date('2024-01-04T11:20:00Z'),
    },
    {
      userId: operator1.id,
      type: 'WITHDRAW' as const,
      amount: 20000,
      balanceAfter: 59500,
      description: '提现',
      status: 'COMPLETED' as const,
      createdAt: new Date('2024-01-05T16:45:00Z'),
    },
  ];

  for (const tx of transactions1) {
    await prisma.transactionLog.create({
      data: tx,
    });
  }

  console.log(`✓ 为 ${operator1.displayName} 创建了 ${transactions1.length} 条交易流水\n`);

  // 获取第二个操作员（李四）
  const operator2 = await prisma.user.findUnique({
    where: { email: 'lisi@operators.com' },
  });

  if (operator2) {
    console.log(`为操作员 ${operator2.displayName} 创建交易流水...`);

    const transactions2 = [
      {
        userId: operator2.id,
        type: 'DEPOSIT' as const,
        amount: 80000,
        balanceAfter: 80000,
        description: '初始充值',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-10T10:00:00Z'),
      },
      {
        userId: operator2.id,
        type: 'BUY' as const,
        symbol: 'BNBUSDT',
        amount: 50,
        price: 300,
        total: 15000,
        balanceAfter: 65000,
        description: '买入 BNB',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-11T14:30:00Z'),
      },
      {
        userId: operator2.id,
        type: 'SELL' as const,
        symbol: 'BNBUSDT',
        amount: 50,
        price: 320,
        total: 16000,
        balanceAfter: 81000,
        description: '卖出 BNB',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-12T09:15:00Z'),
      },
    ];

    for (const tx of transactions2) {
      await prisma.transactionLog.create({
        data: tx,
      });
    }

    console.log(`✓ 为 ${operator2.displayName} 创建了 ${transactions2.length} 条交易流水\n`);
  }

  // 获取第三个操作员（赵六）
  const operator3 = await prisma.user.findUnique({
    where: { email: 'zhaoliu@operators.com' },
  });

  if (operator3) {
    console.log(`为操作员 ${operator3.displayName} 创建交易流水...`);

    const transactions3 = [
      {
        userId: operator3.id,
        type: 'DEPOSIT' as const,
        amount: 150000,
        balanceAfter: 150000,
        description: '初始充值',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        userId: operator3.id,
        type: 'BUY' as const,
        symbol: 'BTCUSDT',
        amount: 2,
        price: 43000,
        total: 86000,
        balanceAfter: 64000,
        description: '买入 BTC',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-02T14:00:00Z'),
      },
      {
        userId: operator3.id,
        type: 'SELL' as const,
        symbol: 'BTCUSDT',
        amount: 2,
        price: 46000,
        total: 92000,
        balanceAfter: 156000,
        description: '卖出 BTC',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-03T10:00:00Z'),
      },
      {
        userId: operator3.id,
        type: 'BUY' as const,
        symbol: 'ETHUSDT',
        amount: 20,
        price: 2600,
        total: 52000,
        balanceAfter: 104000,
        description: '买入 ETH',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-04T15:30:00Z'),
      },
      {
        userId: operator3.id,
        type: 'SELL' as const,
        symbol: 'ETHUSDT',
        amount: 20,
        price: 2800,
        total: 56000,
        balanceAfter: 160000,
        description: '卖出 ETH',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-05T11:00:00Z'),
      },
      {
        userId: operator3.id,
        type: 'WITHDRAW' as const,
        amount: 10000,
        balanceAfter: 150000,
        description: '提现',
        status: 'COMPLETED' as const,
        createdAt: new Date('2024-01-06T16:00:00Z'),
      },
    ];

    for (const tx of transactions3) {
      await prisma.transactionLog.create({
        data: tx,
      });
    }

    console.log(`✓ 为 ${operator3.displayName} 创建了 ${transactions3.length} 条交易流水\n`);
  }

  console.log('✅ 操作员交易流水 mock 数据创建完成！');
}

seedOperatorTransactions()
  .catch((e) => {
    console.error('创建交易流水失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
