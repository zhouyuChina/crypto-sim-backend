# 交易流水与大盘 API 接口文档

## 目录
- [交易流水接口](#交易流水接口)
  - [用户接口](#用户接口)
  - [管理员接口](#管理员接口)
- [大盘接口](#大盘接口)
  - [公开接口](#公开接口)
  - [管理员接口](#管理员接口-1)
- [数据类型说明](#数据类型说明)

---

## 交易流水接口

### 用户接口

---

#### 1. 创建/结算交易（统一接口）

**请求**
```
POST /api/transactions
Authorization: Bearer <access_token>
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 交易类型：`entryPrice`（入场）或 `exitPrice`（出场） |
| price | number | 是 | 价格（入场价或出场价） |

**type = "entryPrice" 时额外字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assetType | string | 是 | 资产类型，如 `BTC`、`ETH` |
| direction | string | 是 | 交易方向：`CALL`（买涨）或 `PUT`（买跌） |
| duration | number | 是 | 交易时长（秒） |
| investAmount | number | 是 | 投资金额，必须大于 0 |
| returnRate | number | 是 | 报酬率（0-10），如 0.85 表示 85% |
| accountType | string | 否 | 账户类型：`DEMO`（默认）或 `REAL` |

**type = "exitPrice" 时额外字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNumber | string | 是 | 订单号 |

**请求示例 - 创建交易**
```json
{
  "type": "entryPrice",
  "price": 50000,
  "assetType": "BTC",
  "direction": "CALL",
  "duration": 60,
  "investAmount": 100,
  "returnRate": 0.85,
  "accountType": "DEMO"
}
```

**请求示例 - 结算交易**
```json
{
  "type": "exitPrice",
  "price": 50100,
  "orderNumber": "TX1732089600ABC123"
}
```

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 交易记录 ID |
| userId | string | 用户 ID |
| userName | string | 用户名 |
| orderNumber | string | 订单号 |
| accountType | string | 账户类型：`DEMO` / `REAL` |
| assetType | string | 资产类型 |
| direction | string | 交易方向：`CALL` / `PUT` |
| entryTime | string | 入场时间（ISO 8601） |
| expiryTime | string | 到期时间（ISO 8601） |
| duration | number | 交易时长（秒） |
| entryPrice | number | 入场价格 |
| currentPrice | number \| null | 当前价格 |
| exitPrice | number \| null | 出场价格 |
| spread | number | 点差 |
| investAmount | number | 投资金额 |
| returnRate | number | 报酬率 |
| actualReturn | number | 实际收益（正数为盈利，负数为亏损） |
| status | string | 状态：`PENDING` / `SETTLED` / `CANCELED` |
| isManaged | boolean | 是否在托管模式下创建 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |
| settledAt | string \| null | 结算时间 |

**响应示例**
```json
{
  "id": "clx1234567890",
  "userId": "user-uuid-123",
  "userName": "测试用户",
  "orderNumber": "TX1732089600ABC123",
  "accountType": "DEMO",
  "assetType": "BTC",
  "direction": "CALL",
  "entryTime": "2025-11-20T10:00:00.000Z",
  "expiryTime": "2025-11-20T10:01:00.000Z",
  "duration": 60,
  "entryPrice": 50000,
  "currentPrice": 50000,
  "exitPrice": null,
  "spread": 5,
  "investAmount": 100,
  "returnRate": 0.85,
  "actualReturn": 0,
  "status": "PENDING",
  "isManaged": false,
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T10:00:00.000Z",
  "settledAt": null
}
```

---

#### 2. 获取交易列表

**请求**
```
GET /api/transactions
Authorization: Bearer <access_token>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assetType | string | 否 | 按资产类型过滤 |
| direction | string | 否 | 按交易方向过滤：`CALL` / `PUT` |
| status | string | 否 | 按状态过滤：`PENDING` / `SETTLED` / `CANCELED` |
| accountType | string | 否 | 按账户类型过滤：`DEMO` / `REAL` |
| userName | string | 否 | 按用户名模糊搜索 |
| isManaged | boolean | 否 | 按托管状态过滤 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**请求示例**
```
GET /api/transactions?status=PENDING&accountType=DEMO&page=1&limit=10
```

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | array | 交易记录数组（结构同上） |
| total | number | 总记录数 |
| page | number | 当前页码 |
| limit | number | 每页数量 |

**响应示例**
```json
{
  "data": [
    {
      "id": "clx1234567890",
      "userId": "user-uuid-123",
      "userName": "测试用户",
      "orderNumber": "TX1732089600ABC123",
      "accountType": "DEMO",
      "assetType": "BTC",
      "direction": "CALL",
      "entryTime": "2025-11-20T10:00:00.000Z",
      "expiryTime": "2025-11-20T10:01:00.000Z",
      "duration": 60,
      "entryPrice": 50000,
      "currentPrice": 50050,
      "exitPrice": null,
      "spread": 5,
      "investAmount": 100,
      "returnRate": 0.85,
      "actualReturn": 0,
      "status": "PENDING",
      "isManaged": false,
      "createdAt": "2025-11-20T10:00:00.000Z",
      "updatedAt": "2025-11-20T10:00:30.000Z",
      "settledAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

#### 3. 获取交易统计

**请求**
```
GET /api/transactions/statistics
Authorization: Bearer <access_token>
```

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| accountBalance | number | 账户总余额（兼容旧字段） |
| demoBalance | number | 虚拟账户余额 |
| realBalance | number | 真实账户余额 |
| totalProfitLoss | number | 总盈亏 |
| winRate | number | 胜率（百分比） |
| totalTrades | number | 总交易次数 |
| settledTrades | number | 已结算交易数 |
| winningTrades | number | 盈利交易数 |
| losingTrades | number | 亏损交易数 |

**响应示例**
```json
{
  "accountBalance": 10000,
  "demoBalance": 10000,
  "realBalance": 0,
  "totalProfitLoss": 850,
  "winRate": 65.5,
  "totalTrades": 100,
  "settledTrades": 100,
  "winningTrades": 65,
  "losingTrades": 35
}
```

---

#### 4. 获取交易详情

**请求**
```
GET /api/transactions/:orderNumber
Authorization: Bearer <access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNumber | string | 是 | 订单号 |

**响应体**

同「创建/结算交易」的响应体。

---

#### 5. 手动结算交易

**请求**
```
POST /api/transactions/:orderNumber/settle
Authorization: Bearer <access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNumber | string | 是 | 订单号 |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exitPrice | number | 是 | 出场价格，必须大于 0 |

**请求示例**
```json
{
  "exitPrice": 50100
}
```

**响应体**

同「创建/结算交易」的响应体。

---

#### 6. 取消交易

**请求**
```
POST /api/transactions/:orderNumber/cancel
Authorization: Bearer <access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNumber | string | 是 | 订单号 |

**响应体**

同「创建/结算交易」的响应体，状态变为 `CANCELED`。

---

#### 7. 自动结算过期交易

**请求**
```
POST /api/transactions/auto-settle
```

**说明**

此接口为公开接口，用于触发系统自动结算所有已过期的交易。

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| settledCount | number | 本次结算的交易数量 |

**响应示例**
```json
{
  "settledCount": 5
}
```

---

### 管理员接口

---

#### 1. 获取所有交易列表

**请求**
```
GET /api/admin/transactions
Authorization: Bearer <admin_access_token>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 否 | 按用户 ID 过滤 |
| username | string | 否 | 按用户名模糊搜索 |
| managedMode | boolean | 否 | 按托管模式过滤 |
| assetType | string | 否 | 按资产类型过滤 |
| direction | string | 否 | 按交易方向过滤 |
| status | string | 否 | 按状态过滤 |
| accountType | string | 否 | 按账户类型过滤 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应体**

同用户「获取交易列表」接口。

---

#### 2. 强制结算交易

**请求**
```
POST /api/admin/transactions/:orderNumber/force-settle
Authorization: Bearer <admin_access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNumber | string | 是 | 订单号 |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exitPrice | number | 否 | 出场价格 |
| result | string | 否 | 强制结果：`WIN` 或 `LOSE` |
| reason | string | 否 | 强制结算原因 |

**请求示例**
```json
{
  "exitPrice": 50100,
  "result": "WIN",
  "reason": "客服人工干预"
}
```

**响应体**

同「创建/结算交易」的响应体，额外包含人工干预信息。

---

## 大盘接口

### 公开接口

---

#### 1. 获取当前活跃大盘

**请求**
```
GET /api/market-sessions/active
```

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 大盘 ID |
| name | string | 大盘名称 |
| description | string \| null | 描述 |
| startTime | string | 开始时间（ISO 8601） |
| endTime | string | 结束时间（ISO 8601） |
| initialResult | string | 初始结果：`PENDING` / `WIN` / `LOSE` |
| actualResult | string \| null | 实际结果 |
| status | string | 状态：`PENDING` / `ACTIVE` / `COMPLETED` / `CANCELED` |
| assetType | string \| null | 资产类型 |
| tradeTypes | array \| null | 支持的交易类型配置 |
| createdById | string | 创建者 ID |
| createdByName | string \| null | 创建者名称 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

**响应示例**
```json
{
  "id": "ms-uuid-123",
  "name": "早盘",
  "description": "上午交易时段",
  "startTime": "2025-11-20T09:00:00.000Z",
  "endTime": "2025-11-20T12:00:00.000Z",
  "initialResult": "PENDING",
  "actualResult": null,
  "status": "ACTIVE",
  "assetType": "BTC",
  "tradeTypes": [
    {
      "assetType": "BTC",
      "durations": [30, 60, 120]
    },
    {
      "assetType": "ETH",
      "durations": [60, 120]
    }
  ],
  "createdById": "admin-uuid-123",
  "createdByName": "系统管理员",
  "createdAt": "2025-11-20T08:00:00.000Z",
  "updatedAt": "2025-11-20T09:00:00.000Z"
}
```

---

#### 2. 获取大盘详情

**请求**
```
GET /api/market-sessions/:id
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**响应体**

同「获取当前活跃大盘」。

---

### 管理员接口

---

#### 1. 创建大盘

**请求**
```
POST /api/admin/market-sessions
Authorization: Bearer <admin_access_token>
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 大盘名称 |
| description | string | 否 | 描述 |
| startTime | string | 是 | 开始时间（ISO 8601） |
| endTime | string | 是 | 结束时间（ISO 8601） |
| initialResult | string | 否 | 初始结果，默认 `PENDING` |
| assetType | string | 否 | 资产类型 |
| tradeTypes | array | 否 | 支持的交易类型配置 |

**tradeTypes 数组元素结构**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assetType | string | 是 | 资产类型 |
| durations | number[] | 是 | 支持的时长数组（秒），至少一个 |

**请求示例**
```json
{
  "name": "早盘",
  "description": "上午交易时段",
  "startTime": "2025-11-20T09:00:00.000Z",
  "endTime": "2025-11-20T12:00:00.000Z",
  "initialResult": "PENDING",
  "assetType": "BTC",
  "tradeTypes": [
    {
      "assetType": "BTC",
      "durations": [30, 60, 120]
    },
    {
      "assetType": "ETH",
      "durations": [60, 120]
    }
  ]
}
```

**响应体**

同「获取当前活跃大盘」。

---

#### 2. 获取大盘列表

**请求**
```
GET /api/admin/market-sessions
Authorization: Bearer <admin_access_token>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 按状态过滤：`PENDING` / `ACTIVE` / `COMPLETED` / `CANCELED` |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | array | 大盘记录数组 |
| total | number | 总记录数 |
| page | number | 当前页码 |
| limit | number | 每页数量 |

**响应示例**
```json
{
  "data": [
    {
      "id": "ms-uuid-123",
      "name": "早盘",
      "description": "上午交易时段",
      "startTime": "2025-11-20T09:00:00.000Z",
      "endTime": "2025-11-20T12:00:00.000Z",
      "initialResult": "PENDING",
      "actualResult": null,
      "status": "ACTIVE",
      "assetType": "BTC",
      "tradeTypes": [...],
      "createdById": "admin-uuid-123",
      "createdByName": "系统管理员",
      "createdAt": "2025-11-20T08:00:00.000Z",
      "updatedAt": "2025-11-20T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

#### 3. 获取大盘详情

**请求**
```
GET /api/admin/market-sessions/:id
Authorization: Bearer <admin_access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**响应体**

同「获取当前活跃大盘」。

---

#### 4. 更新大盘

**请求**
```
PUT /api/admin/market-sessions/:id
Authorization: Bearer <admin_access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 大盘名称 |
| description | string | 否 | 描述 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| initialResult | string | 否 | 初始结果 |
| actualResult | string | 否 | 实际结果 |
| assetType | string | 否 | 资产类型 |
| tradeTypes | array | 否 | 交易类型配置 |

**请求示例**
```json
{
  "name": "早盘（已修改）",
  "endTime": "2025-11-20T13:00:00.000Z"
}
```

**响应体**

同「获取当前活跃大盘」。

---

#### 5. 删除大盘

**请求**
```
DELETE /api/admin/market-sessions/:id
Authorization: Bearer <admin_access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**响应体**

| 字段 | 类型 | 说明 |
|------|------|------|
| message | string | 删除成功消息 |

**响应示例**
```json
{
  "message": "大盘已删除"
}
```

---

#### 6. 开启大盘

**请求**
```
POST /api/admin/market-sessions/:id/start
Authorization: Bearer <admin_access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**响应体**

同「获取当前活跃大盘」，状态变为 `ACTIVE`。

---

#### 7. 关闭大盘

**请求**
```
POST /api/admin/market-sessions/:id/stop
Authorization: Bearer <admin_access_token>
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 大盘 ID |

**响应体**

同「获取当前活跃大盘」，状态变为 `COMPLETED`。

---

## 数据类型说明

### TransactionStatus（交易状态）

| 值 | 说明 |
|-----|------|
| `PENDING` | 进行中 |
| `SETTLED` | 已结算 |
| `CANCELED` | 已取消 |

### TradeDirection（交易方向）

| 值 | 说明 |
|-----|------|
| `CALL` | 买涨 |
| `PUT` | 买跌 |

### AccountType（账户类型）

| 值 | 说明 |
|-----|------|
| `DEMO` | 虚拟账户 |
| `REAL` | 真实账户 |

### MarketResult（大盘结果）

| 值 | 说明 |
|-----|------|
| `PENDING` | 待开奖 |
| `WIN` | 买涨获胜 |
| `LOSE` | 买跌获胜 |

### MarketSessionStatus（大盘状态）

| 值 | 说明 |
|-----|------|
| `PENDING` | 待开始 |
| `ACTIVE` | 进行中 |
| `COMPLETED` | 已完成 |
| `CANCELED` | 已取消 |

---

## 错误响应

所有接口在出错时返回统一格式：

```json
{
  "statusCode": 400,
  "message": "错误信息",
  "error": "Bad Request"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 token 过期） |
| 403 | 禁止访问（无权限） |
| 404 | 资源不存在 |
| 409 | 冲突（如重复操作） |
| 500 | 服务器内部错误 |

---

## 重要业务规则

1. **交易与大盘关联**：真实账户（REAL）的交易会自动关联当前活跃的大盘。如果创建交易时没有活跃的大盘，该交易在结算时会直接判为亏损。

2. **虚拟账户**：虚拟账户（DEMO）的交易不受大盘影响，仅用于练习。

3. **手机号**：手机号为可选字段，且不要求唯一（多个用户可以使用相同手机号）。

4. **统计数据**：用户统计数据（胜率、总盈亏等）仅统计真实账户的交易。
