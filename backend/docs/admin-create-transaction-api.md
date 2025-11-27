# 管理端创建自定义交易流水接口文档

## 概述

管理端可以为指定用户创建自定义交易流水记录，支持创建待结算或已结算的交易。此功能用于管理员手动调整用户交易记录、补录历史数据或测试目的。

## 接口信息

**接口地址**
```
POST /api/admin/transactions/create
```

**权限要求**
- 需要管理员权限 (`admin` 角色)
- 需要在请求头中携带有效的 JWT Token

## 请求参数

### Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### Body 参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 目标用户ID |
| assetType | string | 是 | 资产类型（如 BTC, ETH） |
| direction | string | 是 | 交易方向：`CALL`（买涨）或 `PUT`（买跌） |
| duration | number | 是 | 交易时长（秒） |
| entryPrice | number | 是 | 入场价格 |
| investAmount | number | 是 | 投入金额 |
| returnRate | number | 是 | 报酬率（0-10），如 0.85 表示 85% |
| accountType | string | 否 | 账户类型：`DEMO`（虚拟）或 `REAL`（真实），默认 `DEMO` |
| entryTime | string | 否 | 自定义入场时间（ISO 8601 格式），默认当前时间 |
| exitPrice | number | 否 | 出场价格，如果提供则创建已结算的交易 |
| status | string | 否 | 交易状态：`PENDING`、`SETTLED`、`CANCELED`，默认 `PENDING` |
| autoSettle | boolean | 否 | 是否自动结算（当提供 exitPrice 时），默认 `true` |
| reason | string | 否 | 创建原因（用于审计） |

## 使用场景

### 场景 1：创建待结算的交易

用于模拟用户正在进行的交易。

**请求示例**
```bash
curl -X POST "http://localhost:3000/api/admin/transactions/create" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "9dd28c89-c428-499c-8407-7415aed741ed",
    "assetType": "BTC",
    "direction": "CALL",
    "duration": 300,
    "entryPrice": 45000,
    "investAmount": 100,
    "returnRate": 0.85,
    "accountType": "DEMO",
    "reason": "测试数据"
  }'
```

**响应示例**
```json
{
  "data": {
    "id": "uuid",
    "userId": "9dd28c89-c428-499c-8407-7415aed741ed",
    "userName": "张三",
    "orderNumber": "ORD20251124123456789012",
    "accountType": "DEMO",
    "assetType": "BTC",
    "direction": "CALL",
    "entryTime": "2025-11-24T12:34:56.000Z",
    "expiryTime": "2025-11-24T12:39:56.000Z",
    "duration": 300,
    "entryPrice": 45000,
    "currentPrice": 45000,
    "exitPrice": null,
    "spread": 4.5,
    "investAmount": 100,
    "returnRate": 0.85,
    "actualReturn": 0,
    "status": "PENDING",
    "createdAt": "2025-11-24T12:34:56.000Z",
    "updatedAt": "2025-11-24T12:34:56.000Z",
    "settledAt": null,
    "isManaged": false,
    "marketSessionId": null,
    "marketSessionName": null
  }
}
```

### 场景 2：创建已结算的盈利交易

用于补录历史交易或调整用户盈利。

**请求示例**
```bash
curl -X POST "http://localhost:3000/api/admin/transactions/create" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "9dd28c89-c428-499c-8407-7415aed741ed",
    "assetType": "ETH",
    "direction": "CALL",
    "duration": 300,
    "entryPrice": 3000,
    "exitPrice": 3100,
    "investAmount": 200,
    "returnRate": 0.85,
    "accountType": "REAL",
    "entryTime": "2025-11-20T10:00:00.000Z",
    "reason": "补录历史盈利交易"
  }'
```

**响应示例**
```json
{
  "data": {
    "id": "uuid",
    "userId": "9dd28c89-c428-499c-8407-7415aed741ed",
    "orderNumber": "ORD20251124123456789013",
    "accountType": "REAL",
    "assetType": "ETH",
    "direction": "CALL",
    "entryTime": "2025-11-20T10:00:00.000Z",
    "expiryTime": "2025-11-20T10:05:00.000Z",
    "duration": 300,
    "entryPrice": 3000,
    "exitPrice": 3100,
    "investAmount": 200,
    "returnRate": 0.85,
    "actualReturn": 370,
    "status": "SETTLED",
    "settledAt": "2025-11-24T12:34:56.000Z",
    "isManaged": false,
    "marketSessionId": "xxx",
    "marketSessionName": "大盘A"
  }
}
```

**计算逻辑**：
- 入场价格 3000，出场价格 3100
- 方向 CALL（买涨），价格上涨，判定盈利
- 实际收益 = 投入金额 × (1 + 报酬率) = 200 × (1 + 0.85) = 370

### 场景 3：创建已结算的亏损交易

用于补录历史亏损或调整用户余额。

**请求示例**
```bash
curl -X POST "http://localhost:3000/api/admin/transactions/create" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "9dd28c89-c428-499c-8407-7415aed741ed",
    "assetType": "BTC",
    "direction": "PUT",
    "duration": 600,
    "entryPrice": 45000,
    "exitPrice": 45500,
    "investAmount": 150,
    "returnRate": 0.85,
    "accountType": "DEMO",
    "reason": "补录历史亏损交易"
  }'
```

**计算逻辑**：
- 入场价格 45000，出场价格 45500
- 方向 PUT（买跌），价格上涨，判定亏损
- 实际收益 = -投入金额 = -150

### 场景 4：创建指定时间的交易

用于补录特定时间点的交易记录。

**请求示例**
```bash
curl -X POST "http://localhost:3000/api/admin/transactions/create" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "9dd28c89-c428-499c-8407-7415aed741ed",
    "assetType": "BTC",
    "direction": "CALL",
    "duration": 300,
    "entryPrice": 44000,
    "exitPrice": 44500,
    "investAmount": 100,
    "returnRate": 0.85,
    "accountType": "DEMO",
    "entryTime": "2025-11-01T08:00:00.000Z",
    "reason": "补录11月1日交易"
  }'
```

## 业务逻辑

### 1. 余额处理

#### PENDING 状态
- 创建时从用户账户扣除投入金额
- 根据 `accountType` 扣除对应账户（`demoBalance` 或 `realBalance`）

#### SETTLED 状态
- 不扣除投入金额
- 直接增加/减少实际收益到用户账户
- 更新用户统计数据（仅真实仓）

### 2. 盈亏计算

**盈利条件**：
- CALL（买涨）：出场价 > 入场价
- PUT（买跌）：出场价 < 入场价

**收益计算（实际盈亏）**：
- 盈利：`actualReturn = investAmount × returnRate`
- 亏损：`actualReturn = -investAmount`

### 3. 审计追踪

所有管理端创建的交易都会记录：
- `manualAdjusted`: true（标记为手动调整）
- `manualAdjustedById`: 操作管理员ID
- `manualAdjustedByName`: 操作管理员名称
- `manualAdjustmentReason`: 创建原因
- `manualAdjustedAt`: 操作时间

### 4. 真实仓特殊处理

创建真实仓交易时：
- 自动关联当前活跃的大盘（marketSession）
- 更新用户总盈亏、胜率、交易次数等统计数据
- 如果没有活跃大盘，`marketSessionId` 为 null

## 错误处理

### 用户不存在
```json
{
  "statusCode": 404,
  "message": "用户不存在"
}
```

### 余额不足（PENDING 状态）
```json
{
  "statusCode": 400,
  "message": "虚拟账户余额不足。当前余额: 50, 需要: 100"
}
```

### 缺少出场价格（SETTLED 状态）
```json
{
  "statusCode": 400,
  "message": "结算状态的交易必须提供出场价格 (exitPrice)"
}
```

### 权限不足
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

## 注意事项

1. **余额检查**
   - 创建 PENDING 状态交易时会检查用户余额
   - 创建 SETTLED 状态交易时不检查余额（直接调整）

2. **时间处理**
   - `entryTime` 默认为服务器当前时间
   - `expiryTime` 自动计算为 `entryTime + duration`
   - 可以补录历史交易，只需指定 `entryTime`

3. **自动结算**
   - 提供 `exitPrice` 且 `autoSettle` 不为 false 时，自动创建已结算交易
   - 即使 `status` 为 `PENDING`，也会自动改为 `SETTLED`

4. **统计影响**
   - 仅真实仓（REAL）的已结算交易会影响用户统计数据
   - 虚拟仓（DEMO）交易不影响总盈亏和胜率

5. **审计日志**
   - 所有操作都会记录操作员信息
   - 建议在 `reason` 字段中详细说明创建原因

## 完整示例代码

### JavaScript/TypeScript

```typescript
async function adminCreateTransaction(
  adminToken: string,
  transaction: {
    userId: string;
    assetType: string;
    direction: 'CALL' | 'PUT';
    duration: number;
    entryPrice: number;
    investAmount: number;
    returnRate: number;
    accountType?: 'DEMO' | 'REAL';
    exitPrice?: number;
    entryTime?: string;
    reason?: string;
  }
) {
  const response = await fetch('http://localhost:3000/api/admin/transactions/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transaction),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// 使用示例：创建已结算的盈利交易
const result = await adminCreateTransaction(adminToken, {
  userId: '9dd28c89-c428-499c-8407-7415aed741ed',
  assetType: 'BTC',
  direction: 'CALL',
  duration: 300,
  entryPrice: 45000,
  exitPrice: 46000,
  investAmount: 200,
  returnRate: 0.85,
  accountType: 'REAL',
  reason: '补录用户盈利交易',
});

console.log('创建成功:', result.data);
```

### Python

```python
import requests

def admin_create_transaction(admin_token, transaction):
    response = requests.post(
        'http://localhost:3000/api/admin/transactions/create',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        json=transaction
    )

    response.raise_for_status()
    return response.json()

# 使用示例：创建待结算交易
result = admin_create_transaction(admin_token, {
    'userId': '9dd28c89-c428-499c-8407-7415aed741ed',
    'assetType': 'ETH',
    'direction': 'PUT',
    'duration': 600,
    'entryPrice': 3000,
    'investAmount': 150,
    'returnRate': 0.85,
    'accountType': 'DEMO',
    'reason': '测试用户交易'
})

print('创建成功:', result['data'])
```

## 相关接口

- [管理端交易列表查询](./admin-transactions-api.md) - 查询用户交易记录
- [管理端强制结算](./force-settle-api.md) - 强制结算指定交易
- [用户余额调整](./adjust-balance-api.md) - 直接调整用户余额

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-11-24 | 1.0.0 | 初始版本 |
