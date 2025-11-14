# WebSocket 连接问题修复总结

## 问题描述

前端尝试连接 WebSocket 时报错:
```
WebSocket connection to 'ws://localhost:3000/admin/chat?token=...' failed
```

## 根本原因 (已确认)

有**两个**问题导致连接失败:

### ❌ 问题 1: 前端使用了错误的客户端库 (主要问题)

- **前端错误**: 使用原生 WebSocket API (`new WebSocket()`)
- **后端要求**: Socket.IO 客户端 (`socket.io-client`)
- **不兼容原因**: Socket.IO 使用自己的握手协议和消息格式,与原生 WebSocket 完全不兼容

**错误的代码示例:**
```javascript
// ❌ 错误 - 使用原生 WebSocket (会失败)
const ws = new WebSocket('ws://localhost:3000/admin/chat?token=...');
```

**正确的代码示例:**
```javascript
// ✅ 正确 - 使用 Socket.IO 客户端
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000/admin/chat', {
  query: { token: '...' }
});
```

### ✅ 问题 2: 后端 namespace 不匹配 (已修复)

- **前端连接地址**: `/admin/chat`
- **后端原配置**: `namespace: '/support'` (❌ 不匹配)
- **后端新配置**: `namespace: '/admin/chat'` (✅ 已修复)

## 解决方案

### 1. 修改后端 namespace (已完成)

修改后端 WebSocket Gateway 的 namespace 配置,使其与前端匹配:

**修改文件:** `backend/src/support/support.gateway.ts`

**修改内容:**
```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/admin/chat', // 从 '/support' 改为 '/admin/chat'
})
```

### 2. 修改前端连接代码 (需要前端开发者完成)

**详细指南:** 参见 [frontend-socketio-integration.md](./frontend-socketio-integration.md)

**快速修复:**

1. 安装 Socket.IO 客户端:
```bash
npm install socket.io-client
```

2. 替换连接代码:
```typescript
// ❌ 删除原生 WebSocket 代码
// const ws = new WebSocket('ws://localhost:3000/admin/chat?token=...');

// ✅ 使用 Socket.IO 客户端
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/admin/chat', {
  query: { token: yourAuthToken },
  transports: ['websocket'],
  reconnection: true,
});

// 监听连接事件
socket.on('connect', () => {
  console.log('✅ 连接成功', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ 连接失败:', error.message);
});

// 监听业务事件
socket.on('support:message', (message) => {
  console.log('📨 新消息:', message);
});
```

## 验证结果

### 后端测试 ✅

使用 Socket.IO 客户端测试连接**成功** ✅:
```
✅ 成功连接到 /admin/chat
Socket ID: vU5FW_lWfuPaPjw1AAAB
Namespace: /admin/chat

📤 发送测试事件...
📥 收到 support:joined 事件: {
  conversationId: 'test-123',
  roomName: 'support:conversation:test-123'
}
📥 收到响应: { success: true, roomName: 'support:conversation:test-123' }
```

### 前端测试 ❌

使用原生 WebSocket 测试连接**失败** (符合预期):
```
❌ 原生 WebSocket 连接失败: socket hang up
原因: 后端使用 Socket.IO,不兼容原生 WebSocket 协议
```

**结论:** 前端必须改用 Socket.IO 客户端才能连接成功。

## 相关接口

### REST API
- ✅ `GET /api/admin/support/conversations` - 获取对话列表 (HTTP 200)
- ✅ `GET /api/admin/support/conversations/:id` - 获取对话详情
- ✅ `POST /api/admin/support/conversations/:id/assign` - 接管对话
- ✅ `POST /api/admin/support/messages` - 发送消息
- ✅ `POST /api/admin/support/upload-image` - 上传图片
- ✅ `POST /api/admin/support/conversations/:id/close` - 关闭对话
- ✅ `GET /api/admin/support/unread-count` - 获取未读消息统计

### WebSocket Events (namespace: `/admin/chat`)

**客户端发送:**
- `support:join` - 加入对话房间
- `support:message` - 发送消息
- `support:typing` - 正在输入状态
- `support:read` - 标记已读
- `support:leave` - 离开对话

**服务端发送:**
- `support:joined` - 加入成功确认
- `support:message` - 新消息通知
- `support:typing` - 对方正在输入
- `support:messages-read` - 消息已读通知
- `support:conversation-status` - 对话状态变更
- `support:admin-status` - 管理员在线状态
- `support:error` - 错误消息

## 测试步骤

### 1. 测试 REST API
```bash
# 登录获取 token
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取对话列表
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/admin/support/conversations?status=ACTIVE&page=1&limit=50"
```

### 2. 测试 WebSocket 连接
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/admin/chat', {
  query: { token: '<your-token>' },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ 连接成功');

  // 加入对话
  socket.emit('support:join', {
    conversationId: 'conv-123',
    userType: 'admin'
  });
});

socket.on('support:joined', (data) => {
  console.log('📥 加入对话成功:', data);
});
```

## ⚠️ 重要注意事项

### 1. 必须使用 Socket.IO 客户端 ⚠️

**不能**使用原生 WebSocket API:
```javascript
// ❌ 错误 - 这样无法连接
const ws = new WebSocket('ws://localhost:3000/admin/chat');
```

**必须**使用 Socket.IO 客户端:
```javascript
// ✅ 正确
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000/admin/chat');
```

### 2. 连接地址格式

- **Socket.IO**: `http://localhost:3000/admin/chat` (使用 http/https,Socket.IO 会自动升级)
- **不要使用**: `ws://localhost:3000/admin/chat` (原生 WebSocket 协议地址)

### 3. 认证方式

通过 `query` 参数传递 token:
```javascript
io('http://localhost:3000/admin/chat', {
  query: { token: 'your-jwt-token' }
})
```

### 4. CORS 配置

后端已配置 `cors: { origin: '*' }`,允许所有来源连接

### 5. 房间命名规则

对话房间统一使用 `support:conversation:{conversationId}` 格式

## 相关文件

### 后端
- [backend/src/support/support.gateway.ts](../backend/src/support/support.gateway.ts) - WebSocket Gateway
- [backend/src/support/support-admin.controller.ts](../backend/src/support/support-admin.controller.ts) - 管理员 REST API
- [backend/src/support/support.service.ts](../backend/src/support/support.service.ts) - 业务逻辑
- [backend/src/support/support.module.ts](../backend/src/support/support.module.ts) - 模块配置

### 前端集成指南
- [frontend-socketio-integration.md](./frontend-socketio-integration.md) - 完整的前端集成教程
- 包含完整的代码示例、React Hook、API 参考等

## 修复时间

2025-11-14

## 修复人员

Claude Code
