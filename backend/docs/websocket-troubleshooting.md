# WebSocket 实时推送故障排查指南

## 问题：客户端创建交易后，管理端前端没有收到实时推送

### 排查步骤

#### 1. 检查后端日志

启动后端服务后，当客户端创建交易时，应该看到以下日志：

```
[TransactionLogService] 交易创建成功: ORDER_xxxxx, 用户: xxxxx, 账户类型: DEMO, 资产: BTCUSDT
[TransactionLogService] 准备推送新交易到管理端: ORDER_xxxxx
[AdminTradingGateway] 广播新交易: ORDER_xxxxx, 当前订阅者: X
[AdminTradingGateway] 新交易广播完成: ORDER_xxxxx
[TransactionLogService] 新交易已推送: ORDER_xxxxx
```

**如果看不到这些日志**：
- AdminTradingGateway 可能没有正确注入
- 检查 `transaction-log.module.ts` 是否正确导入了 `AdminTradingModule`

#### 2. 检查前端 WebSocket 连接

前端必须：
1. 连接到 `/admin/trading` 命名空间
2. 发送 `trading:subscribe` 消息订阅更新
3. 监听 `trading:new-transaction` 事件

**验证连接**：
- 打开浏览器开发者工具 -> Network -> WS
- 查看是否有到 `ws://localhost:3000/admin/trading` 的连接
- 查看连接状态是否为 `connected`

#### 3. 检查订阅状态

后端日志应该显示：
```
[AdminTradingGateway] 交易监控客户端连接: xxxxx
[AdminTradingGateway] 管理员 xxxxx 订阅交易监控，当前活跃交易: X
```

**如果没有订阅日志**：
- 前端可能没有发送 `trading:subscribe` 消息
- 检查前端代码中的订阅逻辑

#### 4. 检查房间加入

当广播新交易时，日志显示"当前订阅者: 0"表示没有客户端在 `trading:monitor` 房间中。

**解决方法**：
- 前端必须发送 `trading:subscribe` 消息
- 后端会将客户端加入 `trading:monitor` 房间（admin-trading.gateway.ts:55）

#### 5. 检查事件名称匹配

确保前后端事件名称完全一致：

| 后端发送 | 前端监听 |
|---------|---------|
| `trading:new-transaction` | `trading:new-transaction` |
| `trading:status-changed` | `trading:status-changed` |
| `trading:transaction-updated` | `trading:transaction-updated` |
| `trading:initial-data` | `trading:initial-data` |

### 常见问题

#### Q: 日志显示"当前订阅者: 0"
**A**: 前端没有正确订阅。检查：
1. WebSocket 是否连接成功
2. 是否发送了 `trading:subscribe` 消息
3. 消息格式是否正确：`{ adminId: 'xxx' }`

#### Q: 前端收到连接成功，但收不到推送
**A**: 检查：
1. 后端是否有推送日志
2. 事件名称是否匹配
3. 前端是否在正确的命名空间监听

#### Q: 只有管理员操作时才推送，用户创建交易时不推送
**A**: 检查 `transaction-log.service.ts` 的 `createTransaction` 方法是否调用了 `broadcastNewTransaction`

### 测试步骤

1. **启动后端**：
   ```bash
   npm run start:dev
   ```

2. **打开管理端前端**：
   - 登录管理员账号
   - 进入交易监控页面
   - 打开浏览器控制台查看 WebSocket 连接

3. **创建测试交易**：
   - 使用用户账号创建一笔交易
   - 查看后端日志是否有推送记录
   - 查看管理端前端是否实时显示新交易

4. **查看日志**：
   ```bash
   # 后端日志
   npm run start:dev | grep -E "(TransactionLog|AdminTrading|trading:)"

   # 前端控制台
   # 应该看到 WebSocket 消息
   ```

### 修改记录

- ✅ 添加了 `AdminTradingGateway` 到 `TransactionLogService`
- ✅ 在 `createTransaction` 中添加了 `broadcastNewTransaction` 调用
- ✅ 在 `settleTransactionBySystem` 中添加了 `broadcastTransactionStatusChange` 调用
- ✅ 在 `adminCreateTransaction` 中添加了 `broadcastNewTransaction` 调用
- ✅ 移除了不必要的 `forwardRef`
- ✅ 添加了详细的调试日志
