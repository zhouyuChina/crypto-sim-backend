# 强制结算交易接口文档

## 概述

强制结算交易功能允许管理员手动结算用户的未平仓交易,可以指定结算价格和结算结果(输赢)。这个功能通常用于处理异常交易、系统维护或特殊情况下的交易平仓。

## 接口详情

### 强制结算单笔交易

管理员强制结算指定的交易订单。

**接口地址**
```
POST /admin/transactions/:orderNumber/force-settle
```

**权限要求**
- 需要管理员权限 (`admin` 角色)
- 需要在请求头中携带有效的管理员 JWT Token

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNumber | string | 是 | 交易订单号 |

**请求参数**

Content-Type: `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exitPrice | number | 否 | 平仓价格(如不指定,使用当前市场价) |
| result | string | 否 | 强制结算结果,可选值: `WIN` 或 `LOSE` |
| reason | string | 否 | 强制结算原因说明 |

**请求示例**

示例 1: 指定平仓价格和结果
```bash
curl -X POST "http://localhost:3000/admin/transactions/ORD-1234567890/force-settle" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "exitPrice": 50000.00,
    "result": "WIN",
    "reason": "系统维护,强制平仓"
  }'
```

示例 2: 仅指定结果,使用当前市场价
```bash
curl -X POST "http://localhost:3000/admin/transactions/ORD-1234567890/force-settle" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "result": "LOSE",
    "reason": "用户违规操作"
  }'
```

示例 3: 仅指定平仓价格,自动计算输赢
```bash
curl -X POST "http://localhost:3000/admin/transactions/ORD-1234567890/force-settle" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "exitPrice": 48500.00,
    "reason": "市场异常,手动平仓"
  }'
```

示例 4: 使用当前市场价和自动计算输赢
```bash
curl -X POST "http://localhost:3000/admin/transactions/ORD-1234567890/force-settle" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "紧急平仓"
  }'
```

**响应示例**

成功响应 (200 OK):
```json
{
  "id": "uuid-123",
  "orderNumber": "ORD-1234567890",
  "userId": "user-uuid",
  "symbol": "BTCUSDT",
  "type": "LONG",
  "status": "SETTLED",
  "entryPrice": 49000.00,
  "exitPrice": 50000.00,
  "quantity": 0.1,
  "leverage": 10,
  "marginUsed": 490.00,
  "profitLoss": 100.00,
  "profitLossPercentage": 20.41,
  "result": "WIN",
  "accountType": "REAL",
  "entryTime": "2025-11-23T10:00:00.000Z",
  "exitTime": "2025-11-23T12:30:00.000Z",
  "forced": true,
  "reason": "系统维护,强制平仓",
  "operatorId": "admin-uuid",
  "operatorName": "系统管理员",
  "createdAt": "2025-11-23T10:00:00.000Z",
  "updatedAt": "2025-11-23T12:30:00.000Z"
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 交易记录ID |
| orderNumber | string | 订单号 |
| userId | string | 用户ID |
| symbol | string | 交易对 |
| type | string | 交易类型: `LONG`(做多) 或 `SHORT`(做空) |
| status | string | 交易状态: `SETTLED`(已结算) |
| entryPrice | number | 开仓价格 |
| exitPrice | number | 平仓价格 |
| quantity | number | 交易数量 |
| leverage | number | 杠杆倍数 |
| marginUsed | number | 使用的保证金 |
| profitLoss | number | 盈亏金额 |
| profitLossPercentage | number | 盈亏百分比 |
| result | string | 交易结果: `WIN`(盈利) 或 `LOSE`(亏损) |
| accountType | string | 账户类型: `REAL`(真实仓) 或 `DEMO`(模拟仓) |
| entryTime | string | 开仓时间(ISO 8601) |
| exitTime | string | 平仓时间(ISO 8601) |
| forced | boolean | 是否为强制结算 |
| reason | string | 强制结算原因 |
| operatorId | string | 操作员ID |
| operatorName | string | 操作员名称 |
| createdAt | string | 创建时间(ISO 8601) |
| updatedAt | string | 更新时间(ISO 8601) |

**错误响应**

400 Bad Request - 参数错误:
```json
{
  "statusCode": 400,
  "message": ["result must be one of the following values: WIN, LOSE"],
  "error": "Bad Request"
}
```

401 Unauthorized - 未授权:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

403 Forbidden - 权限不足:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

404 Not Found - 交易订单不存在:
```json
{
  "statusCode": 404,
  "message": "交易订单不存在",
  "error": "Not Found"
}
```

400 Bad Request - 交易已结算:
```json
{
  "statusCode": 400,
  "message": "交易已结算,无法再次结算",
  "error": "Bad Request"
}
```

---

## 使用场景

### 1. 系统维护

在系统维护或升级前,强制平仓所有未平仓交易:
```bash
# 使用当前市场价平仓
POST /admin/transactions/:orderNumber/force-settle
{
  "reason": "系统维护,强制平仓"
}
```

### 2. 处理异常交易

当发现用户交易异常时,手动干预:
```bash
# 指定结果为亏损
POST /admin/transactions/:orderNumber/force-settle
{
  "result": "LOSE",
  "reason": "检测到异常交易行为"
}
```

### 3. 市场异常处理

在市场数据异常时,使用合理的价格平仓:
```bash
# 指定合理的平仓价格
POST /admin/transactions/:orderNumber/force-settle
{
  "exitPrice": 49500.00,
  "reason": "市场数据异常,使用修正价格平仓"
}
```

### 4. 用户申诉处理

处理用户投诉或申诉,调整交易结果:
```bash
# 将亏损交易改为盈利
POST /admin/transactions/:orderNumber/force-settle
{
  "result": "WIN",
  "exitPrice": 50500.00,
  "reason": "用户申诉审核通过,调整交易结果"
}
```

---

## 参数说明

### exitPrice (平仓价格)

- **可选参数**,不指定时使用当前市场价格
- 必须是正数
- 建议使用合理的市场价格,避免给用户造成不公平的结果

### result (结算结果)

- **可选参数**,不指定时根据价格自动计算
- 可选值:
  - `WIN`: 强制设置为盈利
  - `LOSE`: 强制设置为亏损
- 当指定 `result` 时,系统会忽略实际的价格计算,直接使用指定的结果
- 使用场景:
  - 需要人工判定交易结果时
  - 处理特殊情况或申诉时

### reason (原因说明)

- **可选参数**,建议填写
- 用于记录强制结算的原因,方便后续审计和追溯
- 建议填写清晰、具体的原因说明

---

## 注意事项

### 1. 操作记录

- 所有强制结算操作都会记录操作员信息
- `forced` 字段会被标记为 `true`
- `operatorId` 和 `operatorName` 会记录执行操作的管理员信息

### 2. 余额处理

- 强制结算会自动更新用户余额
- 盈利时增加用户余额
- 亏损时扣除保证金

### 3. 交易状态

- 只能对状态为 `OPEN`(未平仓) 的交易执行强制结算
- 已结算的交易无法再次结算

### 4. 审计追踪

- 建议在 `reason` 字段中详细记录操作原因
- 系统会自动记录操作时间和操作员信息
- 这些信息可用于后续的审计和问题追溯

### 5. 权限控制

- 只有管理员角色可以执行强制结算
- 建议设置二次确认机制,防止误操作

---

## 完整使用示例

### JavaScript/TypeScript

```typescript
// 强制结算交易
async function forceSettleTransaction(
  adminToken: string,
  orderNumber: string,
  params: {
    exitPrice?: number;
    result?: 'WIN' | 'LOSE';
    reason?: string;
  }
) {
  const response = await fetch(
    `http://localhost:3000/admin/transactions/${orderNumber}/force-settle`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// 使用示例 1: 指定价格和结果
try {
  const result = await forceSettleTransaction(adminToken, 'ORD-1234567890', {
    exitPrice: 50000,
    result: 'WIN',
    reason: '系统维护,强制平仓',
  });
  console.log('结算成功:', result);
} catch (error) {
  console.error('结算失败:', error);
}

// 使用示例 2: 仅指定原因,使用市场价
try {
  const result = await forceSettleTransaction(adminToken, 'ORD-1234567890', {
    reason: '紧急平仓',
  });
  console.log('结算成功:', result);
} catch (error) {
  console.error('结算失败:', error);
}
```

### Python

```python
import requests

def force_settle_transaction(admin_token, order_number, **params):
    """强制结算交易"""
    response = requests.post(
        f'http://localhost:3000/admin/transactions/{order_number}/force-settle',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        },
        json=params
    )

    if response.status_code != 200:
        raise Exception(f"结算失败: {response.json()}")

    return response.json()

# 使用示例 1: 指定价格和结果
try:
    result = force_settle_transaction(
        admin_token,
        'ORD-1234567890',
        exitPrice=50000.00,
        result='WIN',
        reason='系统维护,强制平仓'
    )
    print('结算成功:', result)
except Exception as e:
    print('结算失败:', e)

# 使用示例 2: 仅指定结果
try:
    result = force_settle_transaction(
        admin_token,
        'ORD-1234567890',
        result='LOSE',
        reason='用户违规操作'
    )
    print('结算成功:', result)
except Exception as e:
    print('结算失败:', e)
```

---

## 相关接口

- [交易记录查询接口](./transaction-query-api.md) - 查询交易记录
- [管理员认证接口](./admin-auth-api.md) - 获取管理员 Token

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-11-23 | 1.0.0 | 初始版本 |
