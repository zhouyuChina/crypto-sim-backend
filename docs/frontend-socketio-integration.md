# 前端 Socket.IO 集成指南

## 问题诊断

### 错误原因

前端尝试使用**原生 WebSocket API** 连接到 Socket.IO 服务器,导致连接失败:

```javascript
// ❌ 错误的方式 - 使用原生 WebSocket
const ws = new WebSocket('ws://localhost:3000/admin/chat?token=...');
```

**原因**:
- 后端使用 **Socket.IO** (NestJS 的 `@nestjs/websockets` + `socket.io`)
- Socket.IO 使用自己的握手协议和消息格式,与原生 WebSocket 不兼容

### 测试结果

```
❌ 原生 WebSocket: socket hang up (连接失败)
✅ Socket.IO 客户端: 连接成功
```

## 解决方案

### 1. 安装 Socket.IO 客户端

```bash
npm install socket.io-client
# 或
yarn add socket.io-client
```

### 2. 正确的连接方式

#### TypeScript/JavaScript 示例

```typescript
import { io, Socket } from 'socket.io-client';

// 管理员客服系统配置
const SOCKET_URL = 'http://localhost:3000/admin/chat';

class AdminChatService {
  private socket: Socket | null = null;
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * 连接到管理员客服 WebSocket
   */
  connect() {
    this.socket = io(SOCKET_URL, {
      // 认证 token
      query: { token: this.token },

      // 只使用 websocket 传输 (可选,提高性能)
      transports: ['websocket'],

      // 自动重连配置
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // 监听连接事件
    this.socket.on('connect', () => {
      console.log('✅ 连接成功', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ 连接失败:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 连接断开:', reason);
    });

    // 监听业务事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // 加入对话成功
    this.socket.on('support:joined', (data) => {
      console.log('📥 加入对话成功:', data);
    });

    // 收到新消息
    this.socket.on('support:message', (message) => {
      console.log('📨 新消息:', message);
      // TODO: 更新 UI
    });

    // 对方正在输入
    this.socket.on('support:typing', (data) => {
      console.log('⌨️ 正在输入:', data);
      // TODO: 显示"正在输入"指示器
    });

    // 消息已读
    this.socket.on('support:messages-read', (data) => {
      console.log('✓✓ 已读:', data);
      // TODO: 更新消息状态
    });

    // 对话状态变更
    this.socket.on('support:conversation-status', (data) => {
      console.log('🔄 对话状态变更:', data);
      // TODO: 更新对话列表
    });

    // 错误处理
    this.socket.on('support:error', (error) => {
      console.error('❌ 错误:', error);
      // TODO: 显示错误提示
    });
  }

  /**
   * 加入对话房间
   */
  joinConversation(conversationId: string) {
    if (!this.socket) {
      console.error('Socket 未连接');
      return;
    }

    this.socket.emit(
      'support:join',
      {
        conversationId,
        userType: 'admin',
      },
      (response) => {
        console.log('加入对话响应:', response);
      }
    );
  }

  /**
   * 发送消息
   */
  sendMessage(conversationId: string, senderId: string, senderName: string, content: string) {
    if (!this.socket) {
      console.error('Socket 未连接');
      return;
    }

    this.socket.emit(
      'support:message',
      {
        conversationId,
        senderId,
        senderType: 'ADMIN',
        senderName,
        messageType: 'TEXT',
        content,
      },
      (response) => {
        console.log('发送消息响应:', response);
      }
    );
  }

  /**
   * 发送"正在输入"状态
   */
  sendTyping(conversationId: string, senderName: string) {
    if (!this.socket) return;

    this.socket.emit('support:typing', {
      conversationId,
      senderType: 'ADMIN',
      senderName,
    });
  }

  /**
   * 标记消息为已读
   */
  markAsRead(conversationId: string) {
    if (!this.socket) return;

    this.socket.emit('support:read', {
      conversationId,
      readerType: 'admin',
    });
  }

  /**
   * 离开对话房间
   */
  leaveConversation(conversationId: string) {
    if (!this.socket) return;

    this.socket.emit('support:leave', {
      conversationId,
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// 使用示例
export function useAdminChat(token: string) {
  const chatService = new AdminChatService(token);

  // 组件挂载时连接
  useEffect(() => {
    chatService.connect();

    // 组件卸载时断开
    return () => {
      chatService.disconnect();
    };
  }, []);

  return {
    joinConversation: (id: string) => chatService.joinConversation(id),
    sendMessage: (...args) => chatService.sendMessage(...args),
    sendTyping: (...args) => chatService.sendTyping(...args),
    markAsRead: (id: string) => chatService.markAsRead(id),
    leaveConversation: (id: string) => chatService.leaveConversation(id),
  };
}
```

### 3. React Hook 示例

```typescript
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useAdminChatSocket(token: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 创建 Socket.IO 连接
    const socket = io('http://localhost:3000/admin/chat', {
      query: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // 连接事件
    socket.on('connect', () => {
      console.log('✅ Socket 连接成功');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket 断开连接');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket 连接错误:', error);
      setIsConnected(false);
    });

    // 业务事件
    socket.on('support:message', (message) => {
      console.log('📨 收到新消息:', message);
      setMessages(prev => [...prev, message]);
    });

    socket.on('support:joined', (data) => {
      console.log('📥 加入对话成功:', data);
    });

    // 清理函数
    return () => {
      socket.disconnect();
    };
  }, [token]);

  // 返回 socket 实例和连接状态
  return {
    socket: socketRef.current,
    isConnected,
    messages,
  };
}
```

## API 参考

### 后端 WebSocket Events

#### 客户端发送 (emit)

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `support:join` | `{ conversationId, userType }` | 加入对话房间 |
| `support:message` | `{ conversationId, senderId, senderType, senderName, messageType, content, metadata? }` | 发送消息 |
| `support:typing` | `{ conversationId, senderType, senderName }` | 发送"正在输入"状态 |
| `support:read` | `{ conversationId, readerType }` | 标记消息为已读 |
| `support:leave` | `{ conversationId }` | 离开对话房间 |

#### 服务端发送 (on)

| 事件名 | 数据 | 描述 |
|--------|------|------|
| `connect` | - | 连接成功 |
| `disconnect` | `reason` | 连接断开 |
| `connect_error` | `error` | 连接错误 |
| `support:joined` | `{ conversationId, roomName }` | 加入房间成功确认 |
| `support:message` | `Message` | 新消息通知 |
| `support:typing` | `{ senderType, senderName }` | 对方正在输入 |
| `support:messages-read` | `{ conversationId, readerType, readAt }` | 消息已读通知 |
| `support:conversation-status` | `{ conversationId, status }` | 对话状态变更 |
| `support:admin-status` | `{ adminId, online }` | 管理员在线状态 |
| `support:error` | `{ message }` | 错误消息 |

## 常见问题

### Q1: 为什么不能使用原生 WebSocket?

**A**: 后端使用 Socket.IO 框架,它有以下特性:
- 自动重连
- 房间和命名空间支持
- 事件确认 (acknowledgements)
- 二进制数据支持
- 跨浏览器兼容性

Socket.IO 在 WebSocket 之上添加了额外的协议层,因此必须使用 Socket.IO 客户端库。

### Q2: 如何处理重连?

**A**: Socket.IO 自动处理重连,你可以监听事件:

```typescript
socket.on('reconnect', (attemptNumber) => {
  console.log('重连成功,尝试次数:', attemptNumber);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('尝试重连:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('重连失败:', error);
});

socket.on('reconnect_failed', () => {
  console.error('重连失败,已达到最大尝试次数');
});
```

### Q3: 如何调试 Socket.IO 连接?

**A**: 启用调试日志:

```typescript
// 浏览器
localStorage.debug = 'socket.io-client:*';

// Node.js
process.env.DEBUG = 'socket.io-client:*';
```

### Q4: 生产环境配置

```typescript
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000/admin/chat', {
  query: { token },
  transports: ['websocket', 'polling'], // 生产环境添加 polling 作为备选
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 10000,
});
```

## 测试脚本

```bash
# 安装依赖
cd /tmp && npm install socket.io-client

# 测试连接
node /tmp/test_ws_connection.js
```

## 相关文档

- [Socket.IO 官方文档](https://socket.io/docs/v4/)
- [Socket.IO 客户端 API](https://socket.io/docs/v4/client-api/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)

## 总结

✅ **必须使用 `socket.io-client`**,不能使用原生 WebSocket
✅ **连接地址**: `http://localhost:3000/admin/chat` (使用 http/https,Socket.IO 会自动升级)
✅ **认证方式**: 通过 `query` 参数传递 token
✅ **事件驱动**: 使用 `emit` 发送,`on` 监听
