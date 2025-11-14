# 大盘小盘系统设计文档

## 1. 业务需求

### 1.1 大盘（MarketSession）
- **开盘名称**: 例如 "2025-01-14 早盘"
- **开盘时间段**: 开始时间 + 结束时间
- **初始输赢状态**: PENDING（待开盘）→ WIN/LOSE（开盘后设置）
- **交易类型管理**: 支持的交易类型（冗余字段，可选）

### 1.2 小盘（SubMarket）
- **自动创建**: 大盘开启时，根据交易收益配置表自动创建
- **基于利率**: 每个不同利率（TradingPerformance）创建一个小盘
- **命名规则**: 根据利率命名，例如 "30秒 - 85%利率"
- **独立运行**: 每个小盘独立管理自己的交易周期和状态

### 1.3 核心流程
```
1. 管理员创建大盘
   ↓
2. 设置大盘基本信息（名称、时间段、初始输赢状态）
   ↓
3. 大盘开启（状态变为 ACTIVE）
   ↓
4. 系统自动查询所有 TradingPerformance 配置
   ↓
5. 为每个利率配置创建一个小盘
   ↓
6. 小盘自动开始运行，产生交易周期
   ↓
7. 大盘结束时，所有小盘同时结束
```

## 2. 数据库设计

### 2.1 大盘表（MarketSession）

```prisma
model MarketSession {
  id                String             @id @default(uuid())
  name              String             // 开盘名称，如 "2025-01-14 早盘"
  description       String?            // 描述
  startTime         DateTime           // 开盘开始时间
  endTime           DateTime           // 开盘结束时间
  initialResult     MarketResult       @default(PENDING) // 初始输赢状态
  actualResult      MarketResult?      // 实际结算结果
  status            MarketSessionStatus @default(PENDING) // 大盘状态
  tradeTypes        Json?              // 支持的交易类型（冗余字段）
  assetType         String?            // 资产类型，如 "BTC/USDT"

  createdById       String             // 创建者（管理员ID）
  createdByName     String?            // 创建者名称
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  subMarkets        SubMarket[]        // 关联的小盘

  @@index([status, startTime])
  @@index([createdAt])
}

// 大盘状态
enum MarketSessionStatus {
  PENDING    // 待开盘
  ACTIVE     // 进行中
  COMPLETED  // 已完成
  CANCELED   // 已取消
}

// 市场结果（输赢状态）
enum MarketResult {
  PENDING    // 待定（未开盘）
  WIN        // 赢（用户角度）
  LOSE       // 输（用户角度）
}
```

### 2.2 小盘表（SubMarket）

```prisma
model SubMarket {
  id                  String           @id @default(uuid())
  marketSessionId     String           // 关联的大盘ID
  name                String           // 小盘名称，如 "30秒 - 85%利率"
  tradeDuration       Int              // 交易时长（秒）
  profitRate          Decimal          @db.Decimal(5, 2) // 利率（0-200）
  status              SubMarketStatus  @default(PENDING) // 小盘状态

  startTime           DateTime?        // 实际开始时间
  endTime             DateTime?        // 实际结束时间

  totalCycles         Int              @default(0) // 总周期数
  completedCycles     Int              @default(0) // 已完成周期数

  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  marketSession       MarketSession    @relation(fields: [marketSessionId], references: [id], onDelete: Cascade)
  cycles              SubMarketCycle[] // 小盘的交易周期

  @@index([marketSessionId, status])
  @@index([tradeDuration])
}

// 小盘状态
enum SubMarketStatus {
  PENDING    // 待开始
  ACTIVE     // 运行中
  COMPLETED  // 已完成
  STOPPED    // 已停止
}
```

### 2.3 小盘周期表（SubMarketCycle）

```prisma
model SubMarketCycle {
  id            String          @id @default(uuid())
  subMarketId   String          // 关联的小盘ID
  cycleNumber   Int             // 周期编号
  startTime     DateTime        // 周期开始时间
  endTime       DateTime        // 周期结束时间
  status        CycleStatus     @default(PENDING) // 周期状态

  // 价格信息
  startPrice    Decimal?        @db.Decimal(18, 8)
  endPrice      Decimal?        @db.Decimal(18, 8)

  // 统计信息
  orderCount    Int             @default(0) // 该周期的订单数
  totalAmount   Decimal         @default(0) @db.Decimal(18, 8) // 总投注金额

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  subMarket     SubMarket       @relation(fields: [subMarketId], references: [id], onDelete: Cascade)
  transactions  TransactionLog[] // 该周期的交易流水

  @@index([subMarketId, cycleNumber])
  @@index([status, startTime])
}
```

## 3. API 设计

### 3.1 大盘管理 API

#### 创建大盘
```
POST /api/admin/market-sessions
{
  "name": "2025-01-14 早盘",
  "description": "今日早盘交易时段",
  "startTime": "2025-01-14T09:00:00Z",
  "endTime": "2025-01-14T12:00:00Z",
  "initialResult": "PENDING",
  "tradeTypes": ["CALL", "PUT"],
  "assetType": "BTC/USDT"
}
```

#### 获取大盘列表
```
GET /api/admin/market-sessions?status=ACTIVE&page=1&limit=20
```

#### 获取大盘详情
```
GET /api/admin/market-sessions/:id
```

#### 开启大盘
```
POST /api/admin/market-sessions/:id/start
```
**功能**:
1. 大盘状态变为 ACTIVE
2. 自动查询所有 TradingPerformance 配置
3. 为每个利率创建对应的小盘
4. 启动所有小盘

#### 关闭大盘
```
POST /api/admin/market-sessions/:id/stop
```
**功能**:
1. 大盘状态变为 COMPLETED
2. 停止所有小盘
3. 结算所有未完成的交易

#### 设置大盘结果
```
PUT /api/admin/market-sessions/:id/result
{
  "actualResult": "WIN"
}
```

#### 删除大盘
```
DELETE /api/admin/market-sessions/:id
```

### 3.2 小盘管理 API

#### 获取小盘列表
```
GET /api/admin/sub-markets?marketSessionId=xxx&page=1&limit=20
```

#### 获取小盘详情
```
GET /api/admin/sub-markets/:id
```

#### 手动停止小盘
```
POST /api/admin/sub-markets/:id/stop
```

#### 获取小盘周期列表
```
GET /api/admin/sub-markets/:id/cycles?page=1&limit=50
```

### 3.3 用户端 API

#### 获取当前活跃的大盘
```
GET /api/market-sessions/active
```

#### 获取大盘的小盘列表
```
GET /api/market-sessions/:id/sub-markets
```

#### 获取小盘的当前周期
```
GET /api/sub-markets/:id/current-cycle
```

## 4. 核心业务逻辑

### 4.1 大盘开启流程

```typescript
async startMarketSession(marketSessionId: string) {
  // 1. 更新大盘状态为 ACTIVE
  const marketSession = await this.prisma.marketSession.update({
    where: { id: marketSessionId },
    data: {
      status: 'ACTIVE',
      startTime: new Date()
    }
  });

  // 2. 查询所有交易收益配置
  const tradingPerformances = await this.prisma.tradingPerformance.findMany({
    orderBy: { tradeDuration: 'asc' }
  });

  // 3. 为每个利率配置创建小盘
  const subMarkets = [];
  for (const tp of tradingPerformances) {
    const subMarket = await this.prisma.subMarket.create({
      data: {
        marketSessionId,
        name: `${tp.tradeDuration}秒 - ${tp.winRate}%利率`,
        tradeDuration: tp.tradeDuration,
        profitRate: tp.winRate,
        status: 'ACTIVE',
        startTime: new Date()
      }
    });
    subMarkets.push(subMarket);

    // 4. 为每个小盘启动第一个周期
    await this.startSubMarketCycle(subMarket.id);
  }

  return { marketSession, subMarkets };
}
```

### 4.2 小盘周期管理

```typescript
async startSubMarketCycle(subMarketId: string) {
  const subMarket = await this.prisma.subMarket.findUnique({
    where: { id: subMarketId }
  });

  const cycleNumber = subMarket.totalCycles + 1;
  const now = new Date();
  const endTime = new Date(now.getTime() + subMarket.tradeDuration * 1000);

  // 创建新周期
  const cycle = await this.prisma.subMarketCycle.create({
    data: {
      subMarketId,
      cycleNumber,
      startTime: now,
      endTime,
      status: 'RUNNING'
    }
  });

  // 更新小盘统计
  await this.prisma.subMarket.update({
    where: { id: subMarketId },
    data: {
      totalCycles: { increment: 1 }
    }
  });

  // 设置定时器，周期结束时自动结算
  setTimeout(() => {
    this.completeCycle(cycle.id);
  }, subMarket.tradeDuration * 1000);

  return cycle;
}

async completeCycle(cycleId: string) {
  // 1. 更新周期状态
  await this.prisma.subMarketCycle.update({
    where: { id: cycleId },
    data: {
      status: 'COMPLETED',
      endTime: new Date()
    }
  });

  // 2. 结算该周期的所有交易
  await this.settleTransactions(cycleId);

  // 3. 检查小盘是否还在运行，如果是则启动下一个周期
  const cycle = await this.prisma.subMarketCycle.findUnique({
    where: { id: cycleId },
    include: { subMarket: { include: { marketSession: true } } }
  });

  if (cycle.subMarket.status === 'ACTIVE' &&
      cycle.subMarket.marketSession.status === 'ACTIVE') {
    // 启动下一个周期
    await this.startSubMarketCycle(cycle.subMarketId);
  }
}
```

### 4.3 关联 TransactionLog

在用户下单时，需要关联到对应的小盘周期：

```typescript
async createTransaction(userId: string, data: CreateTransactionDto) {
  // 1. 查找当前活跃的小盘（根据交易时长）
  const subMarket = await this.findActiveSubMarket(data.duration);

  // 2. 获取小盘当前的运行周期
  const currentCycle = await this.getCurrentCycle(subMarket.id);

  // 3. 创建交易流水，关联到周期
  const transaction = await this.prisma.transactionLog.create({
    data: {
      ...data,
      userId,
      subMarketCycleId: currentCycle.id, // 新增字段
      // ... 其他字段
    }
  });

  return transaction;
}
```

## 5. 实施步骤

### Phase 1: 数据库设计（1天）
1. ✅ 设计 MarketSession、SubMarket、SubMarketCycle 模型
2. ✅ 更新 Prisma Schema
3. ✅ 运行数据库迁移

### Phase 2: 核心服务（2天）
4. 创建 MarketSessionModule
5. 实现大盘 CRUD 操作
6. 实现大盘开启/关闭逻辑
7. 实现小盘自动创建逻辑

### Phase 3: 周期管理（1-2天）
8. 实现小盘周期自动创建
9. 实现周期自动结算
10. 实现与交易流水的关联

### Phase 4: API 开发（1天）
11. 实现管理员端 API
12. 实现用户端 API
13. 添加权限控制

### Phase 5: 测试（1天）
14. 单元测试
15. 集成测试
16. E2E 测试

## 6. 注意事项

1. **时区处理**: 所有时间使用 UTC，前端负责转换
2. **并发控制**: 使用事务保证数据一致性
3. **定时任务**: 使用 NestJS Schedule 模块管理周期
4. **错误处理**: 周期结算失败时的重试机制
5. **性能优化**: 大盘结束时批量结算交易

## 7. 扩展功能

### 7.1 可选功能
- 📊 大盘统计报表
- 📈 小盘实时数据推送（WebSocket）
- 🔔 大盘开启/结束通知
- 📅 大盘预约功能
- 🎯 基于大盘结果的自动结算规则
