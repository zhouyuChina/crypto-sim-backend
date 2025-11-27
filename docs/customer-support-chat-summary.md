# 客服对话系统 - 技术方案总结

## 📋 核心需求

实现用户与管理员之间的实时即时通信，支持：
- ✅ 文字消息
- ✅ 图片消息
- ✅ 实时推送
- ✅ 消息历史
- ✅ 未读计数

## 🏗️ 技术架构图

```
用户客户端                管理后台
    │                      │
    │    WebSocket +       │
    │    REST API          │
    ▼                      ▼
┌─────────────────────────────────┐
│     Support Chat Module         │
│  ┌──────────┐  ┌──────────┐    │
│  │ Gateway  │  │Controller│    │
│  └─────┬────┘  └────┬─────┘    │
│        │            │           │
│        └──────┬─────┘           │
│               ▼                 │
│          ┌─────────┐            │
│          │ Service │            │
│          └────┬────┘            │
└───────────────┼─────────────────┘
                ▼
           PostgreSQL
      (ChatConversation
       + ChatMessage)
```

## 📊 数据库设计

### 表 1: ChatConversation（对话会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | String | 用户 ID |
| adminId | String? | 管理员 ID |
| status | Enum | ACTIVE/CLOSED/ARCHIVED |
| unreadUserCount | Int | 用户未读数 |
| unreadAdminCount | Int | 管理员未读数 |
| lastMessageAt | DateTime? | 最后消息时间 |
| lastMessage | String? | 最后消息内容 |

### 表 2: ChatMessage（聊天消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| conversationId | String | 所属对话 |
| senderId | String | 发送者 ID |
| senderType | Enum | USER/ADMIN/SYSTEM |
| messageType | Enum | TEXT/IMAGE/SYSTEM |
| content | Text | 消息内容 |
| isRead | Boolean | 是否已读 |
| readAt | DateTime? | 阅读时间 |

## 🔌 API 接口

### REST API

#### 用户端
```http
GET    /api/support/conversation          # 获取或创建对话
GET    /api/support/messages               # 获取消息历史
POST   /api/support/upload-image           # 上传图片
PUT    /api/support/messages/:id/read      # 标记已读
POST   /api/support/conversation/:id/close # 关闭对话
```

#### 管理员端
```http
GET    /api/admin/support/conversations          # 对话列表
GET    /api/admin/support/conversations/:id      # 对话详情
POST   /api/admin/support/conversations/:id/assign  # 接管对话
POST   /api/admin/support/messages                # 发送消息
POST   /api/admin/support/upload-image            # 上传图片
GET    /api/admin/support/unread-count            # 未读统计
```

### WebSocket 事件

#### 客户端发送
```typescript
support:join      // 加入对话房间
support:message   // 发送消息
support:typing    // 正在输入
support:read      // 标记已读
support:leave     // 离开对话
```

#### 服务器推送
```typescript
support:message          // 新消息
support:message-read     // 消息已读
support:typing           // 对方正在输入
support:conversation-status  // 对话状态变更
support:admin-status     // 管理员在线状态
```

## 📁 模块结构

```
backend/src/support/
├── support.module.ts          # 模块定义
├── support.controller.ts      # REST API
├── support.service.ts         # 业务逻辑
├── support.gateway.ts         # WebSocket
├── dto/                       # 数据传输对象
└── interceptors/              # 文件上传拦截器
```

## 🔐 安全措施

| 安全项 | 实现方式 |
|--------|----------|
| 权限控制 | JWT + @Roles 装饰器 |
| XSS 防护 | sanitize-html 过滤 |
| 频率限制 | @nestjs/throttler (10条/分钟) |
| 图片验证 | file-type 检查真实类型 |
| 文件大小 | Multer 限制 5MB |

## ⚡ 性能优化

| 优化项 | 方案 |
|--------|------|
| 消息分页 | 游标分页，每页 50 条 |
| 消息缓存 | Redis 缓存最近消息 |
| 图片压缩 | Sharp 压缩到 1920x1080 |
| WebSocket | 使用房间机制减少广播 |

## 📈 实施计划

### Phase 1: 基础架构（1-2天）
- [ ] 创建 Prisma Schema
- [ ] 运行数据库迁移
- [ ] 创建 Support 模块骨架

### Phase 2: 核心功能（2-3天）
- [ ] 实现消息收发逻辑
- [ ] 实现 WebSocket 事件
- [ ] 实现文件上传

### Phase 3: 高级功能（1-2天）
- [ ] 未读消息计数
- [ ] 在线状态管理
- [ ] 消息已读状态

### Phase 4: 测试与部署（1-2天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试

**总计：5-9 个工作日**

## 🎯 关键技术点

### 1. 房间管理
```typescript
const roomName = `support:conversation:${conversationId}`;
socket.join(roomName);
this.server.to(roomName).emit('support:message', message);
```

### 2. 未读计数
```typescript
// 发送消息时
if (senderType === 'user') {
  conversation.unreadAdminCount += 1;
}

// 标记已读时
conversation.unreadAdminCount = 0;
await updateConversation();
```

### 3. 图片上传流程
```typescript
1. 前端上传图片 → POST /api/support/upload-image
2. 服务器保存文件 → 返回 imageUrl
3. 前端发送消息 → emit('support:message', { type: 'image', content: imageUrl })
4. 服务器存储消息 → 推送给对方
```

## 💡 前端集成示例

### 连接与监听
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken }
});

socket.emit('support:join', { conversationId, userType: 'user' });
socket.on('support:message', (msg) => console.log(msg));
```

### 发送文字
```typescript
socket.emit('support:message', {
  conversationId: 'xxx',
  messageType: 'text',
  content: '你好'
});
```

### 发送图片
```typescript
// 1. 上传图片
const formData = new FormData();
formData.append('image', file);
const res = await fetch('/api/support/upload-image', {
  method: 'POST',
  body: formData
});
const { imageUrl } = await res.json();

// 2. 发送图片消息
socket.emit('support:message', {
  conversationId: 'xxx',
  messageType: 'image',
  content: imageUrl
});
```

## 📚 相关文档

- 📖 [完整设计文档](./customer-support-chat-design.md) - 详细的技术实现方案
- 📘 [Socket.IO 文档](https://socket.io/docs/)
- 📗 [NestJS WebSocket](https://docs.nestjs.com/websockets/gateways)

## 🚀 下一步

请确认技术方案后，我可以开始实施：
1. 创建数据库 Schema
2. 实现基础模块
3. 开发核心功能
4. 编写测试用例

需要我现在开始实施吗？
