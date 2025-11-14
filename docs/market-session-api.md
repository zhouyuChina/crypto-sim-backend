# 大小盘系统 API 文档

## 概述

大小盘系统用于管理交易时段（大盘）和基于不同利率的独立交易盘（小盘）。

- **大盘（MarketSession）**: 定义一个交易时段，如"早盘"、"午盘"等
- **小盘（SubMarket）**: 大盘开启时，根据 TradingPerformance 配置自动创建，每个利率对应一个小盘
- **小盘周期（SubMarketCycle）**: 小盘中的交易周期，自动循环创建和结算

## 基础 URL

```
开发环境: http://localhost:3000/api
生产环境: https://your-domain.com/api
```

---

## 用户端 API

### 1. 获取活跃的大盘

获取当前正在进行中的所有大盘及其小盘列表。

**接口**
```
GET /api/market-sessions/active
```

**权限**: 公开（无需认证）

**请求示例**
```bash
curl -X GET http://localhost:3000/api/market-sessions/active
```

**响应示例**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "2025-01-14 早盘",
    "description": "今日早盘交易时段",
    "startTime": "2025-01-14T01:00:00.000Z",
    "endTime": "2025-01-14T04:00:00.000Z",
    "initialResult": "PENDING",
    "actualResult": null,
    "status": "ACTIVE",
    "tradeTypes": [
      {
        "assetType": "BTC/USDT",
        "durations": [30, 60, 120]
      }
    ],
    "assetType": "BTC/USDT",
    "createdById": "admin-id",
    "createdByName": "管理员",
    "createdAt": "2025-01-14T00:00:00.000Z",
    "updatedAt": "2025-01-14T01:00:00.000Z",
    "subMarkets": [
      {
        "id": "sub-market-id-1",
        "name": "30秒 - 85%利率",
        "tradeDuration": 30,
        "profitRate": 85.00,
        "totalCycles": 120
      },
      {
        "id": "sub-market-id-2",
        "name": "60秒 - 90%利率",
        "tradeDuration": 60,
        "profitRate": 90.00,
        "totalCycles": 60
      }
    ]
  }
]
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 大盘 ID |
| name | string | 大盘名称 |
| description | string | 大盘描述 |
| startTime | datetime | 开盘时间 |
| endTime | datetime | 结束时间 |
| initialResult | enum | 初始结果: PENDING, WIN, LOSE |
| actualResult | enum | 实际结果: PENDING, WIN, LOSE |
| status | enum | 大盘状态: PENDING, ACTIVE, COMPLETED, CANCELED |
| tradeTypes | json | 支持的交易类型配置 |
| assetType | string | 资产类型，如 "BTC/USDT" |
| subMarkets | array | 关联的小盘列表 |
| subMarkets[].tradeDuration | int | 交易时长（秒） |
| subMarkets[].profitRate | decimal | 利率（0-200） |
| subMarkets[].totalCycles | int | 总周期数 |

---

### 2. 获取大盘详情

获取指定大盘的详细信息，包括小盘和最近的周期。

**接口**
```
GET /api/market-sessions/:id
```

**权限**: 公开（无需认证）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**请求示例**
```bash
curl -X GET http://localhost:3000/api/market-sessions/550e8400-e29b-41d4-a716-446655440000
```

**响应示例**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "2025-01-14 早盘",
  "description": "今日早盘交易时段",
  "startTime": "2025-01-14T01:00:00.000Z",
  "endTime": "2025-01-14T04:00:00.000Z",
  "initialResult": "PENDING",
  "actualResult": null,
  "status": "ACTIVE",
  "tradeTypes": null,
  "assetType": "BTC/USDT",
  "createdById": "admin-id",
  "createdByName": "管理员",
  "createdAt": "2025-01-14T00:00:00.000Z",
  "updatedAt": "2025-01-14T01:00:00.000Z",
  "subMarkets": [
    {
      "id": "sub-market-id-1",
      "marketSessionId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "30秒 - 85%利率",
      "tradeDuration": 30,
      "profitRate": 85.00,
      "status": "ACTIVE",
      "startTime": "2025-01-14T01:00:00.000Z",
      "endTime": null,
      "totalCycles": 120,
      "completedCycles": 50,
      "createdAt": "2025-01-14T01:00:00.000Z",
      "updatedAt": "2025-01-14T01:30:00.000Z",
      "cycles": [
        {
          "id": "cycle-id-1",
          "subMarketId": "sub-market-id-1",
          "cycleNumber": 51,
          "startTime": "2025-01-14T01:25:00.000Z",
          "endTime": "2025-01-14T01:25:30.000Z",
          "status": "RUNNING",
          "startPrice": "43250.5",
          "endPrice": null,
          "orderCount": 15,
          "totalAmount": "5000.00",
          "createdAt": "2025-01-14T01:25:00.000Z",
          "updatedAt": "2025-01-14T01:25:00.000Z"
        }
      ]
    }
  ]
}
```

---

### 3. 获取小盘当前周期

获取指定小盘当前正在运行的周期信息。用户下单前需要先获取当前周期。

**接口**
```
GET /api/market-sessions/sub-markets/:subMarketId/current-cycle
```

**权限**: 公开（无需认证）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| subMarketId | string | 是 | 小盘 ID |

**请求示例**
```bash
curl -X GET http://localhost:3000/api/market-sessions/sub-markets/sub-market-id-1/current-cycle
```

**响应示例**
```json
{
  "id": "cycle-id-1",
  "subMarketId": "sub-market-id-1",
  "cycleNumber": 51,
  "startTime": "2025-01-14T01:25:00.000Z",
  "endTime": "2025-01-14T01:25:30.000Z",
  "status": "RUNNING",
  "startPrice": "43250.5",
  "endPrice": null,
  "orderCount": 15,
  "totalAmount": "5000.00",
  "createdAt": "2025-01-14T01:25:00.000Z",
  "updatedAt": "2025-01-14T01:25:00.000Z"
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 周期 ID |
| subMarketId | string | 所属小盘 ID |
| cycleNumber | int | 周期编号（从 1 开始） |
| startTime | datetime | 周期开始时间 |
| endTime | datetime | 周期结束时间 |
| status | enum | 周期状态: PENDING, RUNNING, COMPLETED, FAILED |
| startPrice | decimal | 开始价格（可能为 null） |
| endPrice | decimal | 结束价格（可能为 null） |
| orderCount | int | 该周期的订单数 |
| totalAmount | decimal | 总投注金额 |

**错误响应**
```json
{
  "statusCode": 404,
  "message": "当前没有运行中的周期",
  "error": "Not Found"
}
```

---

### 4. 获取小盘历史周期

分页获取小盘的历史周期列表。

**接口**
```
GET /api/market-sessions/sub-markets/:subMarketId/cycles
```

**权限**: 公开（无需认证）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| subMarketId | string | 是 | 小盘 ID |

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| status | string | 否 | - | 周期状态筛选: PENDING, RUNNING, COMPLETED, FAILED |
| page | int | 否 | 1 | 页码 |
| limit | int | 否 | 20 | 每页数量（最大 100） |
| from | datetime | 否 | - | 开始时间筛选 |
| to | datetime | 否 | - | 结束时间筛选 |

**请求示例**
```bash
curl -X GET "http://localhost:3000/api/market-sessions/sub-markets/sub-market-id-1/cycles?status=COMPLETED&page=1&limit=10"
```

**响应示例**
```json
{
  "data": [
    {
      "id": "cycle-id-50",
      "subMarketId": "sub-market-id-1",
      "cycleNumber": 50,
      "startTime": "2025-01-14T01:24:30.000Z",
      "endTime": "2025-01-14T01:25:00.000Z",
      "status": "COMPLETED",
      "startPrice": "43245.2",
      "endPrice": "43250.5",
      "orderCount": 20,
      "totalAmount": "7500.00",
      "createdAt": "2025-01-14T01:24:30.000Z",
      "updatedAt": "2025-01-14T01:25:00.000Z",
      "subMarket": {
        "id": "sub-market-id-1",
        "name": "30秒 - 85%利率",
        "profitRate": 85.00,
        "tradeDuration": 30
      }
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

---

## 管理员 API

### 5. 创建大盘

创建一个新的大盘。大盘创建后状态为 PENDING，需要手动开启。

**接口**
```
POST /api/admin/market-sessions
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 大盘名称 |
| description | string | 否 | 大盘描述 |
| startTime | datetime | 是 | 开盘时间 |
| endTime | datetime | 是 | 结束时间 |
| initialResult | enum | 否 | 初始结果: PENDING, WIN, LOSE，默认 PENDING |
| assetType | string | 否 | 资产类型，如 "BTC/USDT" |
| tradeTypes | array | 否 | 支持的交易类型配置 |

**tradeTypes 格式**
```json
[
  {
    "assetType": "BTC/USDT",
    "durations": [30, 60, 120]
  }
]
```

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/market-sessions \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2025-01-14 早盘",
    "description": "今日早盘交易时段",
    "startTime": "2025-01-14T09:00:00Z",
    "endTime": "2025-01-14T12:00:00Z",
    "initialResult": "PENDING",
    "assetType": "BTC/USDT",
    "tradeTypes": [
      {
        "assetType": "BTC/USDT",
        "durations": [30, 60, 120]
      }
    ]
  }'
```

**响应示例**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "2025-01-14 早盘",
  "description": "今日早盘交易时段",
  "startTime": "2025-01-14T09:00:00.000Z",
  "endTime": "2025-01-14T12:00:00.000Z",
  "initialResult": "PENDING",
  "actualResult": null,
  "status": "PENDING",
  "tradeTypes": [
    {
      "assetType": "BTC/USDT",
      "durations": [30, 60, 120]
    }
  ],
  "assetType": "BTC/USDT",
  "createdById": "admin-id",
  "createdByName": "管理员",
  "createdAt": "2025-01-14T08:00:00.000Z",
  "updatedAt": "2025-01-14T08:00:00.000Z"
}
```

---

### 6. 获取大盘列表（管理员）

获取所有大盘列表，支持分页和状态筛选。

**接口**
```
GET /api/admin/market-sessions
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| status | string | 否 | - | 状态筛选: PENDING, ACTIVE, COMPLETED, CANCELED |
| page | int | 否 | 1 | 页码 |
| limit | int | 否 | 20 | 每页数量 |

**请求示例**
```bash
curl -X GET "http://localhost:3000/api/admin/market-sessions?status=ACTIVE&page=1&limit=20" \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "marketSessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "2025-01-14 早盘",
      "status": "ACTIVE",
      "startTime": "2025-01-14T01:00:00.000Z",
      "endTime": "2025-01-14T04:00:00.000Z",
      "createdAt": "2025-01-14T00:00:00.000Z",
      "subMarkets": [
        {
          "id": "sub-market-id-1",
          "name": "30秒 - 85%利率",
          "status": "ACTIVE",
          "tradeDuration": 30,
          "profitRate": 85.00,
          "totalCycles": 120,
          "completedCycles": 50
        }
      ]
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### 7. 更新大盘

更新大盘信息。只能更新未开启或已完成的大盘。

**接口**
```
PUT /api/admin/market-sessions/:id
```

**权限**: 需要管理员权限（admin）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**请求体**（所有字段可选）

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 大盘名称 |
| description | string | 大盘描述 |
| startTime | datetime | 开盘时间 |
| endTime | datetime | 结束时间 |
| initialResult | enum | 初始结果 |
| actualResult | enum | 实际结果 |
| assetType | string | 资产类型 |
| tradeTypes | array | 交易类型配置 |

**请求示例**
```bash
curl -X PUT http://localhost:3000/api/admin/market-sessions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2025-01-14 早盘（更新）",
    "actualResult": "WIN"
  }'
```

---

### 8. 删除大盘

删除大盘。只能删除未开启或已完成的大盘，不能删除进行中的大盘。

**接口**
```
DELETE /api/admin/market-sessions/:id
```

**权限**: 需要管理员权限（admin）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**请求示例**
```bash
curl -X DELETE http://localhost:3000/api/admin/market-sessions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "message": "删除成功"
}
```

**错误响应**
```json
{
  "statusCode": 400,
  "message": "无法删除正在进行中的大盘",
  "error": "Bad Request"
}
```

---

### 9. 开启大盘

开启大盘，自动根据 TradingPerformance 配置创建小盘并启动周期。

**接口**
```
POST /api/admin/market-sessions/:id/start
```

**权限**: 需要管理员权限（admin）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/market-sessions/550e8400-e29b-41d4-a716-446655440000/start \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "marketSession": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "2025-01-14 早盘",
    "status": "ACTIVE",
    "subMarkets": [
      {
        "id": "sub-market-id-1",
        "name": "30秒 - 85%利率",
        "tradeDuration": 30,
        "profitRate": 85.00,
        "status": "ACTIVE",
        "totalCycles": 1,
        "completedCycles": 0,
        "cycles": [
          {
            "id": "cycle-id-1",
            "cycleNumber": 1,
            "status": "RUNNING",
            "startTime": "2025-01-14T01:00:00.000Z",
            "endTime": "2025-01-14T01:00:30.000Z"
          }
        ]
      }
    ]
  },
  "subMarketsCreated": 3
}
```

**流程说明**

1. 大盘状态更新为 ACTIVE
2. 查询所有 TradingPerformance 配置
3. 为每个利率配置创建一个小盘
4. 每个小盘自动启动第一个周期
5. 周期会自动循环，直到大盘关闭

**错误响应**
```json
{
  "statusCode": 400,
  "message": "系统尚未配置交易收益，请先配置后再开启大盘",
  "error": "Bad Request"
}
```

---

### 10. 关闭大盘

关闭大盘，同时停止所有小盘和周期。

**接口**
```
POST /api/admin/market-sessions/:id/stop
```

**权限**: 需要管理员权限（admin）

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/market-sessions/550e8400-e29b-41d4-a716-446655440000/stop \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "message": "大盘已关闭",
  "marketSession": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "2025-01-14 早盘",
    "status": "COMPLETED",
    "subMarkets": [
      {
        "id": "sub-market-id-1",
        "name": "30秒 - 85%利率",
        "status": "STOPPED",
        "totalCycles": 120,
        "completedCycles": 120
      }
    ]
  }
}
```

**流程说明**

1. 停止所有小盘
2. 结算所有未完成的周期
3. 大盘状态更新为 COMPLETED

---

### 11. 获取小盘历史周期（管理员）

管理员查看小盘的历史周期，与用户端接口相同。

**接口**
```
GET /api/admin/market-sessions/sub-markets/:subMarketId/cycles
```

**权限**: 需要管理员权限（admin）

参数和响应格式与用户端接口相同，请参考第 4 节。

---

## 数据模型

### MarketSession（大盘）

```typescript
{
  id: string;                      // UUID
  name: string;                    // 大盘名称
  description?: string;            // 描述
  startTime: Date;                 // 开盘时间
  endTime: Date;                   // 结束时间
  initialResult: MarketResult;     // 初始结果
  actualResult?: MarketResult;     // 实际结果
  status: MarketSessionStatus;     // 大盘状态
  tradeTypes?: TradeTypeRule[];    // 交易类型配置
  assetType?: string;              // 资产类型
  createdById: string;             // 创建者 ID
  createdByName?: string;          // 创建者名称
  createdAt: Date;
  updatedAt: Date;
  subMarkets: SubMarket[];         // 关联的小盘
}
```

### SubMarket（小盘）

```typescript
{
  id: string;                      // UUID
  marketSessionId: string;         // 所属大盘 ID
  name: string;                    // 小盘名称
  tradeDuration: number;           // 交易时长（秒）
  profitRate: number;              // 利率（0-200）
  status: SubMarketStatus;         // 小盘状态
  startTime?: Date;                // 开始时间
  endTime?: Date;                  // 结束时间
  totalCycles: number;             // 总周期数
  completedCycles: number;         // 完成周期数
  createdAt: Date;
  updatedAt: Date;
  cycles: SubMarketCycle[];        // 周期列表
}
```

### SubMarketCycle（小盘周期）

```typescript
{
  id: string;                      // UUID
  subMarketId: string;             // 所属小盘 ID
  cycleNumber: number;             // 周期编号
  startTime: Date;                 // 开始时间
  endTime: Date;                   // 结束时间
  status: CycleStatus;             // 周期状态
  startPrice?: number;             // 开始价格
  endPrice?: number;               // 结束价格
  orderCount: number;              // 订单数
  totalAmount: number;             // 总投注金额
  createdAt: Date;
  updatedAt: Date;
}
```

### 枚举类型

```typescript
enum MarketResult {
  PENDING = 'PENDING',   // 待定
  WIN = 'WIN',           // 赢（用户角度）
  LOSE = 'LOSE'          // 输（用户角度）
}

enum MarketSessionStatus {
  PENDING = 'PENDING',     // 待开盘
  ACTIVE = 'ACTIVE',       // 进行中
  COMPLETED = 'COMPLETED', // 已完成
  CANCELED = 'CANCELED'    // 已取消
}

enum SubMarketStatus {
  PENDING = 'PENDING',     // 待开始
  ACTIVE = 'ACTIVE',       // 运行中
  COMPLETED = 'COMPLETED', // 已完成
  STOPPED = 'STOPPED'      // 已停止
}

enum CycleStatus {
  PENDING = 'PENDING',     // 待开始
  RUNNING = 'RUNNING',     // 进行中
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED'        // 失败
}
```

---

## 业务流程

### 大盘开启流程

```
1. 管理员创建大盘（状态: PENDING）
   ↓
2. 管理员开启大盘（POST /api/admin/market-sessions/:id/start）
   ↓
3. 系统查询所有 TradingPerformance 配置
   ↓
4. 为每个利率创建一个小盘（状态: ACTIVE）
   ↓
5. 每个小盘自动启动第一个周期（状态: RUNNING）
   ↓
6. 周期结束后自动结算并创建下一个周期
   ↓
7. 管理员关闭大盘时，停止所有小盘和周期
```

### 用户下单流程

```
1. 用户获取活跃大盘列表
   ↓
2. 选择小盘（基于交易时长和利率）
   ↓
3. 获取小盘当前周期
   ↓
4. 提交订单（关联到 subMarketCycleId）
   ↓
5. 周期结束时系统自动结算订单
```

---

## WebSocket 实时推送（计划中）

未来会提供 WebSocket 接口用于实时推送：

- 周期开始/结束事件
- 大盘状态变化
- 小盘状态变化
- 实时价格更新

---

## 常见问题

**Q: 大盘开启前需要做什么准备？**

A: 需要先配置 TradingPerformance（交易收益配置），否则无法创建小盘。

**Q: 小盘如何自动创建？**

A: 大盘开启时，系统会查询所有 TradingPerformance 配置，为每个不同的利率创建一个独立的小盘。

**Q: 周期如何自动循环？**

A: 系统使用定时任务（每秒扫描），当周期到期时自动结算并创建下一个周期，直到大盘关闭。

**Q: 用户下单时如何关联周期？**

A: 用户下单时需要先获取小盘当前周期，然后在 TransactionLog 中关联 `subMarketCycleId`。

**Q: 大盘关闭后还能重新开启吗？**

A: 不能。大盘关闭后状态变为 COMPLETED，不能重新开启。需要创建新的大盘。

---

## 错误码

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | 大盘已开启或已完成 | 尝试开启已开启的大盘 |
| 400 | 大盘未在运行中 | 尝试关闭未运行的大盘 |
| 400 | 无法删除正在进行中的大盘 | 尝试删除 ACTIVE 状态的大盘 |
| 400 | 系统尚未配置交易收益 | TradingPerformance 未配置 |
| 404 | 大盘不存在 | 大盘 ID 不存在 |
| 404 | 当前没有运行中的周期 | 小盘没有 RUNNING 状态的周期 |

---

## 更新日志

### v1.0.0 (2025-01-14)
- 初始版本
- 实现大盘 CRUD 操作
- 实现小盘自动创建
- 实现周期自动循环
- 实现定时结算
