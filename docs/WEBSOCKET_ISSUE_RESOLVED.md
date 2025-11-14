# WebSocket 连接问题解决方案 🔧

## 📌 问题概述

前端尝试连接管理员客服 WebSocket 时报错:
```
WebSocket connection to 'ws://localhost:3000/admin/chat?token=...' failed
```

## 🎯 根本原因

### ❌ 主要问题: 前端使用了错误的客户端库

**前端当前实现:**
- 使用原生 WebSocket API: `new WebSocket('ws://...')`

**后端实际要求:**
- 使用 Socket.IO 服务器 (NestJS + socket.io)

**为什么不兼容?**
- Socket.IO 不是标准的 WebSocket 协议
- Socket.IO 有自己的握手、心跳、重连机制
- 原生 WebSocket 无法理解 Socket.IO 的消息格式

## ✅ 解决方案

### 后端修改 (已完成 ✓)

修改了 WebSocket namespace 以匹配前端地址:
```typescript
// backend/src/support/support.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/admin/chat', // ✓ 已从 '/support' 改为 '/admin/chat'
})
```

### 前端修改 (需要前端开发者完成)

#### 步骤 1: 安装 Socket.IO 客户端
```bash
npm install socket.io-client
```

#### 步骤 2: 替换连接代码

**删除原生 WebSocket 代码:**
```typescript
// ❌ 删除这些代码
const ws = new WebSocket('ws://localhost:3000/admin/chat?token=...');
ws.onopen = () => { ... };
ws.onmessage = (event) => { ... };
ws.onerror = (error) => { ... };
```

**使用 Socket.IO 客户端:**
```typescript
// ✅ 使用新的代码
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/admin/chat', {
  query: { token: yourAuthToken },
  transports: ['websocket'],
  reconnection: true,
});

// 连接事件
socket.on('connect', () => {
  console.log('✅ 连接成功!', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ 连接失败:', error);
});

// 业务事件
socket.on('support:message', (message) => {
  console.log('📨 收到消息:', message);
});

socket.on('support:joined', (data) => {
  console.log('📥 加入对话成功:', data);
});
```

## 📚 详细文档

- **修复总结**: [websocket-fix-summary.md](./websocket-fix-summary.md)
- **前端集成教程**: [frontend-socketio-integration.md](./frontend-socketio-integration.md)
  - 完整的 TypeScript 代码示例
  - React Hook 封装
  - API 事件参考
  - 常见问题解答

## 🧪 验证测试

### 使用 Socket.IO 客户端 ✅ 成功
```bash
cd /tmp && node test_ws_connection.js
```

结果:
```
✅ 成功连接到 /admin/chat
Socket ID: vU5FW_lWfuPaPjw1AAAB
📥 收到 support:joined 事件
```

### 使用原生 WebSocket ❌ 失败
```bash
cd /tmp && node test_socketio_native_ws.js
```

结果:
```
❌ 原生 WebSocket 连接失败: socket hang up
原因: 后端使用 Socket.IO,不兼容原生 WebSocket 协议
```

## ⚡ 快速对比

| 项目 | 原生 WebSocket | Socket.IO |
|------|--------------|-----------|
| **连接方式** | `new WebSocket('ws://...')` | `io('http://...')` |
| **协议** | 标准 WebSocket (RFC 6455) | Socket.IO 协议 |
| **后端兼容** | ❌ 不兼容 | ✅ 兼容 |
| **自动重连** | 需要手动实现 | ✅ 内置支持 |
| **事件系统** | 需要手动解析消息 | ✅ 事件驱动 API |
| **房间/命名空间** | 需要手动实现 | ✅ 内置支持 |

## 🚀 下一步行动

1. **前端开发者**: 按照 [frontend-socketio-integration.md](./frontend-socketio-integration.md) 修改代码
2. **测试**: 修改后刷新页面,查看浏览器控制台确认连接成功
3. **验证**: 确认能正常收发消息

## 📞 需要帮助?

如有问题,请查看:
1. [Socket.IO 官方文档](https://socket.io/docs/v4/)
2. [frontend-socketio-integration.md](./frontend-socketio-integration.md) 常见问题章节

---

**修复日期**: 2025-11-14
**状态**: 后端已修复 ✓ | 前端待修改 ⏳
