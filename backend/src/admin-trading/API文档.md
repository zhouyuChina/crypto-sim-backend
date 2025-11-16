# 管理员交易监控 WebSocket 接口文档

## 概述

本接口提供管理员实时监控交易的 WebSocket 功能，支持查看、编辑、取消和强制结算交易。

**特点：**
- ✅ 实时推送，无需轮询
- ✅ 双向通信，支持编辑操作
- ✅ 无需 Redis，使用内存事件系统
- ✅ 基于 Socket.IO 实现

## 连接信息

### WebSocket 命名空间

```
ws://localhost:3000/admin/trading
```

生产环境：
```
wss://your-domain.com/admin/trading
```

### 连接示例

**前端连接（Socket.IO 客户端）：**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/admin/trading', {
  auth: {
    token: 'your-admin-jwt-token' // 管理员 JWT 令牌
  }
});

// 监听连接成功
socket.on('connect', () => {
  console.log('已连接到交易监控');
});

// 监听连接错误
socket.on('connect_error', (error) => {
  console.error('连接失败:', error);
});
```

## 客户端发送事件

### 1. 订阅交易更新

订阅后将实时接收交易更新。

**事件名称：** `trading:subscribe`

**请求参数：**

```typescript
{
  adminId: string;  // 管理员用户ID
}
```

**示例：**

```javascript
socket.emit('trading:subscribe', {
  adminId: 'c3c91dc0-ef85-437f-80a3-fd63e720e706'
}, (response) => {
  console.log('订阅成功:', response);
  // 响应: { success: true, count: 10 }
});
```

**响应：**

```typescript
{
  success: boolean;
  count: number;      // 当前活跃交易数量
}
```

**初始数据事件：**

订阅成功后会立即收到当前所有活跃交易：

```javascript
socket.on('trading:initial-data', (data) => {
  console.log('当前活跃交易:', data.transactions);
  console.log('时间戳:', data.timestamp);

  // data 结构：
  // {
  //   transactions: Transaction[],  // 交易列表
  //   timestamp: Date                // 时间戳
  // }
});
```

---

### 2. 取消订阅

停止接收交易更新。

**事件名称：** `trading:unsubscribe`

**请求参数：** 无

**示例：**

```javascript
socket.emit('trading:unsubscribe', {}, (response) => {
  console.log('取消订阅:', response);
  // 响应: { success: true }
});
```

---

### 3. 编辑交易

修改交易的字段信息。

**事件名称：** `trading:edit`

**请求参数：**

```typescript
{
  transactionId: string;    // 交易ID
  adminId: string;          // 管理员ID
  updates: {                // 要更新的字段
    investAmount?: string;  // 投资金额
    returnRate?: string;    // 回报率
    // ... 其他可更新字段
  };
}
```

**示例：**

```javascript
socket.emit('trading:edit', {
  transactionId: 'abc123-def456-ghi789',
  adminId: 'c3c91dc0-ef85-437f-80a3-fd63e720e706',
  updates: {
    investAmount: '1000.50',
    returnRate: '0.85'
  }
}, (response) => {
  if (response.success) {
    console.log('交易已更新:', response.transaction);
  } else {
    console.error('更新失败:', response.error);
  }
});
```

**响应：**

```typescript
{
  success: boolean;
  transaction?: Transaction;  // 更新后的交易对象
  error?: string;             // 错误信息（失败时）
}
```

**注意事项：**
- 只能编辑状态为 `PENDING`（待处理）的交易
- 已结算（SETTLED）或已取消（CANCELED）的交易无法编辑
- 编辑后会自动标记 `manualAdjusted = true`

---

### 4. 取消交易

取消待处理的交易。

**事件名称：** `trading:cancel`

**请求参数：**

```typescript
{
  transactionId: string;  // 交易ID
  adminId: string;        // 管理员ID
  reason?: string;        // 取消原因（可选）
}
```

**示例：**

```javascript
socket.emit('trading:cancel', {
  transactionId: 'abc123-def456-ghi789',
  adminId: 'c3c91dc0-ef85-437f-80a3-fd63e720e706',
  reason: '用户请求取消'
}, (response) => {
  if (response.success) {
    console.log('交易已取消:', response.transaction);
  } else {
    console.error('取消失败:', response.error);
  }
});
```

**响应：**

```typescript
{
  success: boolean;
  transaction?: Transaction;  // 取消后的交易对象
  error?: string;             // 错误信息（失败时）
}
```

**状态变化：**
- 交易状态从 `PENDING` 变为 `CANCELED`
- 设置取消原因和取消时间

---

### 5. 强制结算交易

强制结算交易，可指定自定义结算价格。

**事件名称：** `trading:force-settle`

**请求参数：**

```typescript
{
  transactionId: string;      // 交易ID
  adminId: string;            // 管理员ID
  settlementPrice?: number;   // 自定义结算价格（可选）
}
```

**示例：**

```javascript
socket.emit('trading:force-settle', {
  transactionId: 'abc123-def456-ghi789',
  adminId: 'c3c91dc0-ef85-437f-80a3-fd63e720e706',
  settlementPrice: 50000.00  // 可选：自定义结算价
}, (response) => {
  if (response.success) {
    console.log('交易已强制结算:', response.transaction);
  } else {
    console.error('强制结算失败:', response.error);
  }
});
```

**响应：**

```typescript
{
  success: boolean;
  transaction?: Transaction;  // 结算后的交易对象
  error?: string;             // 错误信息（失败时）
}
```

**说明：**
- 如果不提供 `settlementPrice`，使用当前价格 `currentPrice`
- 交易状态从 `PENDING` 变为 `SETTLED`
- 设置 `settledAt` 时间戳

---

## 服务端推送事件

### 1. 交易更新通知

当交易被编辑、取消或强制结算时触发。

**事件名称：** `trading:transaction-updated`

**数据结构：**

```typescript
{
  transaction: Transaction;  // 更新后的交易对象
  action: string;            // 操作类型: 'edited' | 'cancelled' | 'force-settled'
  timestamp: Date;           // 更新时间戳
}
```

**监听示例：**

```javascript
socket.on('trading:transaction-updated', (data) => {
  console.log('交易已更新:', data.transaction);
  console.log('操作类型:', data.action);

  // 根据操作类型更新UI
  switch(data.action) {
    case 'edited':
      console.log('交易被编辑');
      break;
    case 'cancelled':
      console.log('交易被取消');
      break;
    case 'force-settled':
      console.log('交易被强制结算');
      break;
  }
});
```

---

### 2. 新交易通知

当系统创建新交易时触发。

**事件名称：** `trading:new-transaction`

**数据结构：**

```typescript
{
  transaction: Transaction;  // 新交易对象
  timestamp: Date;           // 创建时间戳
}
```

**监听示例：**

```javascript
socket.on('trading:new-transaction', (data) => {
  console.log('新交易创建:', data.transaction);
  console.log('订单号:', data.transaction.orderNumber);
  console.log('用户:', data.transaction.user.displayName);
});
```

---

### 3. 交易状态变更通知

当交易状态发生变化时触发。

**事件名称：** `trading:status-changed`

**数据结构：**

```typescript
{
  transaction: Transaction;  // 交易对象
  oldStatus: string;         // 旧状态: 'PENDING' | 'SETTLED' | 'CANCELED'
  newStatus: string;         // 新状态: 'PENDING' | 'SETTLED' | 'CANCELED'
  timestamp: Date;           // 变更时间戳
}
```

**监听示例：**

```javascript
socket.on('trading:status-changed', (data) => {
  console.log(`交易状态变更: ${data.oldStatus} → ${data.newStatus}`);
  console.log('交易ID:', data.transaction.id);
});
```

---

### 4. 错误通知

当操作发生错误时触发。

**事件名称：** `trading:error`

**数据结构：**

```typescript
{
  message: string;  // 错误信息
}
```

**监听示例：**

```javascript
socket.on('trading:error', (error) => {
  console.error('错误:', error.message);
  // 显示错误提示给用户
  alert(`操作失败: ${error.message}`);
});
```

---

## 数据结构定义

### Transaction（交易对象）

```typescript
interface Transaction {
  id: string;                      // 交易唯一ID
  userId: string;                  // 用户ID
  userName: string | null;         // 用户名
  orderNumber: string;             // 订单号（唯一）
  assetType: string;               // 资产类型（如 BTCUSDT）
  direction: 'LONG' | 'SHORT';     // 交易方向：做多/做空
  entryTime: Date;                 // 入场时间
  expiryTime: Date;                // 到期时间
  duration: number;                // 持续时间（秒）
  entryPrice: string;              // 入场价格（Decimal字符串）
  currentPrice: string | null;     // 当前价格
  exitPrice: string | null;        // 出场价格
  spread: string;                  // 点差
  investAmount: string;            // 投资金额
  returnRate: string;              // 回报率
  actualReturn: string;            // 实际收益
  status: 'PENDING' | 'SETTLED' | 'CANCELED';  // 交易状态
  manualAdjusted: boolean;         // 是否被人工调整过
  manualAdjustedById: string | null;      // 调整者ID
  manualAdjustedByName: string | null;    // 调整者名称
  manualAdjustmentReason: string | null;  // 调整原因
  manualAdjustedAt: Date | null;          // 调整时间
  createdAt: Date;                 // 创建时间
  updatedAt: Date;                 // 更新时间
  settledAt: Date | null;          // 结算时间
  accountType: 'DEMO' | 'REAL';    // 账户类型：模拟/真实
  isManaged: boolean;              // 是否托管模式
  tradingCycleId: string | null;   // 交易周期ID
  subMarketCycleId: string | null; // 子市场周期ID

  // 关联的用户信息
  user: {
    id: string;
    displayName: string | null;
    email: string;
  };
}
```

### 交易状态说明

| 状态 | 值 | 说明 |
|------|-----|------|
| 待处理 | `PENDING` | 交易已创建，等待结算 |
| 已结算 | `SETTLED` | 交易已完成结算 |
| 已取消 | `CANCELED` | 交易已被取消 |

---

## 完整示例：React Hook

```typescript
import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface Transaction {
  id: string;
  orderNumber: string;
  assetType: string;
  direction: 'LONG' | 'SHORT';
  investAmount: string;
  status: 'PENDING' | 'SETTLED' | 'CANCELED';
  user: {
    displayName: string | null;
    email: string;
  };
  // ... 其他字段
}

export function useAdminTrading(adminId: string, token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 创建 WebSocket 连接
    const newSocket = io('http://localhost:3000/admin/trading', {
      auth: { token }
    });

    // 连接成功
    newSocket.on('connect', () => {
      console.log('WebSocket 已连接');
      setIsConnected(true);

      // 订阅交易更新
      newSocket.emit('trading:subscribe', { adminId });
    });

    // 连接断开
    newSocket.on('disconnect', () => {
      console.log('WebSocket 已断开');
      setIsConnected(false);
    });

    // 接收初始数据
    newSocket.on('trading:initial-data', (data) => {
      console.log('收到初始交易数据:', data.transactions.length);
      setTransactions(data.transactions);
    });

    // 新交易
    newSocket.on('trading:new-transaction', (data) => {
      console.log('新交易:', data.transaction.orderNumber);
      setTransactions(prev => [data.transaction, ...prev]);
    });

    // 交易更新
    newSocket.on('trading:transaction-updated', (data) => {
      console.log('交易更新:', data.transaction.orderNumber, data.action);
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === data.transaction.id ? data.transaction : tx
        )
      );
    });

    // 状态变更
    newSocket.on('trading:status-changed', (data) => {
      console.log('状态变更:', data.oldStatus, '→', data.newStatus);
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === data.transaction.id ? data.transaction : tx
        )
      );
    });

    // 错误处理
    newSocket.on('trading:error', (error) => {
      console.error('WebSocket 错误:', error.message);
      alert(`错误: ${error.message}`);
    });

    setSocket(newSocket);

    // 清理函数
    return () => {
      if (newSocket) {
        newSocket.emit('trading:unsubscribe');
        newSocket.disconnect();
      }
    };
  }, [adminId, token]);

  // 取消交易
  const cancelTransaction = useCallback((transactionId: string, reason?: string) => {
    if (!socket) return Promise.reject('未连接');

    return new Promise((resolve, reject) => {
      socket.emit('trading:cancel', {
        transactionId,
        adminId,
        reason
      }, (response) => {
        if (response.success) {
          resolve(response.transaction);
        } else {
          reject(response.error);
        }
      });
    });
  }, [socket, adminId]);

  // 强制结算
  const forceSettle = useCallback((transactionId: string, settlementPrice?: number) => {
    if (!socket) return Promise.reject('未连接');

    return new Promise((resolve, reject) => {
      socket.emit('trading:force-settle', {
        transactionId,
        adminId,
        settlementPrice
      }, (response) => {
        if (response.success) {
          resolve(response.transaction);
        } else {
          reject(response.error);
        }
      });
    });
  }, [socket, adminId]);

  // 编辑交易
  const editTransaction = useCallback((transactionId: string, updates: any) => {
    if (!socket) return Promise.reject('未连接');

    return new Promise((resolve, reject) => {
      socket.emit('trading:edit', {
        transactionId,
        adminId,
        updates
      }, (response) => {
        if (response.success) {
          resolve(response.transaction);
        } else {
          reject(response.error);
        }
      });
    });
  }, [socket, adminId]);

  return {
    transactions,
    isConnected,
    cancelTransaction,
    forceSettle,
    editTransaction
  };
}
```

### 使用示例

```typescript
function AdminTradingDashboard() {
  const adminId = 'c3c91dc0-ef85-437f-80a3-fd63e720e706';
  const token = localStorage.getItem('admin_token') || '';

  const {
    transactions,
    isConnected,
    cancelTransaction,
    forceSettle,
    editTransaction
  } = useAdminTrading(adminId, token);

  const handleCancel = async (transactionId: string) => {
    try {
      await cancelTransaction(transactionId, '管理员手动取消');
      alert('交易已取消');
    } catch (error) {
      alert(`取消失败: ${error}`);
    }
  };

  const handleForceSettle = async (transactionId: string) => {
    try {
      await forceSettle(transactionId);
      alert('交易已强制结算');
    } catch (error) {
      alert(`结算失败: ${error}`);
    }
  };

  return (
    <div>
      <h1>交易监控</h1>
      <p>连接状态: {isConnected ? '已连接' : '未连接'}</p>
      <p>活跃交易数: {transactions.length}</p>

      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>用户</th>
            <th>资产</th>
            <th>方向</th>
            <th>金额</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id}>
              <td>{tx.orderNumber}</td>
              <td>{tx.user.displayName || tx.user.email}</td>
              <td>{tx.assetType}</td>
              <td>{tx.direction === 'LONG' ? '做多' : '做空'}</td>
              <td>${tx.investAmount}</td>
              <td>
                {tx.status === 'PENDING' ? '待处理' :
                 tx.status === 'SETTLED' ? '已结算' : '已取消'}
              </td>
              <td>
                {tx.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleCancel(tx.id)}>
                      取消
                    </button>
                    <button onClick={() => handleForceSettle(tx.id)}>
                      强制结算
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 安全注意事项

1. **身份验证**
   - 必须使用有效的管理员 JWT token 连接
   - Token 应包含 `admin` 角色权限
   - 建议在服务端验证管理员权限

2. **操作权限**
   - 只有管理员可以访问此命名空间
   - 敏感操作（取消、强制结算）需要验证 adminId

3. **数据安全**
   - 生产环境使用 WSS（加密连接）
   - 不要在客户端暴露完整的用户敏感信息
   - 实施操作日志记录

---

## 性能说明

- **初始数据限制**: 最多返回最近 100 条活跃交易
- **监控范围**: 仅监控 `PENDING` 状态的交易
- **推送频率**: 实时推送，无延迟
- **内存占用**: 轻量级，使用内存事件系统

---

## 常见问题

### Q: 如何知道连接成功？

监听 `connect` 事件：

```javascript
socket.on('connect', () => {
  console.log('已连接，Socket ID:', socket.id);
});
```

### Q: 如何处理断线重连？

Socket.IO 会自动重连，监听重连事件：

```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('重连成功，尝试次数:', attemptNumber);
  // 重新订阅
  socket.emit('trading:subscribe', { adminId });
});
```

### Q: 编辑操作失败怎么办？

检查响应的 `error` 字段：

```javascript
socket.emit('trading:edit', payload, (response) => {
  if (!response.success) {
    console.error('编辑失败:', response.error);
    // 可能的原因：
    // - 交易不存在
    // - 交易已结算或已取消
    // - 权限不足
  }
});
```

### Q: 如何获取历史交易？

此接口仅提供活跃交易监控。历史交易请使用 REST API：

```
GET /api/admin/transactions?status=SETTLED&limit=50
```

---

## 更新日志

### v1.0.0 (2025-11-16)
- 首次发布
- 支持订阅/取消订阅
- 支持编辑、取消、强制结算操作
- 实时推送新交易和状态变更
