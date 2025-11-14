# 客服对话系统技术实现方案

## 1. 系统概述

实现用户与管理员之间的实时即时通信功能，支持文字和图片消息。

### 1.1 核心功能

- ✅ 用户与管理员 1对1 实时对话
- ✅ 支持文字消息
- ✅ 支持图片消息
- ✅ 消息历史记录
- ✅ 未读消息计数
- ✅ 在线状态显示
- ✅ 消息送达/已读状态

## 2. 技术架构

### 2.1 技术栈

- **实时通信**: Socket.IO (已有基础设施)
- **API 框架**: NestJS
- **数据库**: PostgreSQL + Prisma ORM
- **文件存储**: 本地文件系统 / 云存储 (可选)
- **文件上传**: Multer

### 2.2 架构设计

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   用户客户端  │ ◄──────────────────────► │   Gateway   │
└─────────────┘                            └─────────────┘
                                                   │
                  REST API                         │
┌─────────────┐  (HTTP)         ┌──────────────────▼──────┐
│  管理后台    │ ◄──────────────►│  Support Chat Module   │
└─────────────┘                  │  - Controller          │
                                 │  - Service             │
                                 │  - Gateway Handler     │
                                 └────────────┬───────────┘
                                              │
                                         ┌────▼────┐
                                         │ Prisma  │
                                         │   DB    │
                                         └─────────┘
```

## 3. 数据库设计

### 3.1 对话会话表 (ChatConversation)

```prisma
model ChatConversation {
  id              String            @id @default(uuid())
  userId          String            // 用户 ID
  userName        String?           // 用户名称（冗余）
  adminId         String?           // 当前服务的管理员 ID
  adminName       String?           // 管理员名称（冗余）
  status          ConversationStatus @default(ACTIVE) // 对话状态
  unreadUserCount Int               @default(0) // 用户未读消息数
  unreadAdminCount Int              @default(0) // 管理员未读消息数
  lastMessageAt   DateTime?         // 最后一条消息时间
  lastMessage     String?           // 最后一条消息内容（用于列表展示）
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  closedAt        DateTime?         // 关闭时间

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages        ChatMessage[]

  @@index([userId])
  @@index([adminId])
  @@index([status, lastMessageAt])
}

enum ConversationStatus {
  ACTIVE    // 活跃中
  CLOSED    // 已关闭
  ARCHIVED  // 已归档
}
```

### 3.2 聊天消息表 (ChatMessage)

```prisma
model ChatMessage {
  id             String        @id @default(uuid())
  conversationId String        // 对话 ID
  senderId       String        // 发送者 ID
  senderType     SenderType    // 发送者类型（用户/管理员）
  senderName     String?       // 发送者名称
  messageType    MessageType   @default(TEXT) // 消息类型
  content        String        @db.Text // 消息内容（文字或图片 URL）
  metadata       Json?         // 附加信息（图片尺寸、文件大小等）
  isRead         Boolean       @default(false) // 是否已读
  readAt         DateTime?     // 阅读时间
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@index([senderId, senderType])
  @@index([isRead])
}

enum SenderType {
  USER    // 用户
  ADMIN   // 管理员
  SYSTEM  // 系统消息
}

enum MessageType {
  TEXT    // 文字消息
  IMAGE   // 图片消息
  SYSTEM  // 系统消息（如：管理员加入、对话关闭等）
}
```

### 3.3 Prisma Schema 修改

在 `backend/prisma/schema.prisma` 中添加以上模型，并更新 User 模型：

```prisma
model User {
  // ... 现有字段
  conversations  ChatConversation[]
}
```

## 4. API 接口设计

### 4.1 REST API 端点

#### 用户端 API

```typescript
// 1. 获取或创建对话
GET    /api/support/conversation
Response: { conversationId, status, messages, unreadCount }

// 2. 获取消息历史
GET    /api/support/messages?conversationId=xxx&limit=50&offset=0
Response: { messages[], total, hasMore }

// 3. 上传图片
POST   /api/support/upload-image
Body:  multipart/form-data { image: File }
Response: { imageUrl, width, height, size }

// 4. 标记消息已读
PUT    /api/support/messages/:messageId/read
Response: { success: true }

// 5. 关闭对话
POST   /api/support/conversation/:id/close
Response: { success: true }
```

#### 管理员端 API

```typescript
// 1. 获取对话列表
GET    /api/admin/support/conversations?status=active&page=1&limit=20
Response: { conversations[], total, page, pageSize }

// 2. 获取单个对话详情
GET    /api/admin/support/conversations/:id
Response: { conversation, messages[] }

// 3. 接管对话
POST   /api/admin/support/conversations/:id/assign
Response: { success: true, adminId }

// 4. 发送消息（管理员）
POST   /api/admin/support/messages
Body:  { conversationId, messageType, content }
Response: { message }

// 5. 上传图片（管理员）
POST   /api/admin/support/upload-image
Body:  multipart/form-data { image: File }
Response: { imageUrl, width, height, size }

// 6. 关闭对话
POST   /api/admin/support/conversations/:id/close
Response: { success: true }

// 7. 获取未读消息统计
GET    /api/admin/support/unread-count
Response: { totalUnread, conversationCount }
```

### 4.2 WebSocket 事件设计

#### 客户端 → 服务器

```typescript
// 1. 加入对话房间
socket.emit('support:join', { conversationId, userType: 'user' | 'admin' })

// 2. 发送消息
socket.emit('support:message', {
  conversationId,
  messageType: 'text' | 'image',
  content: string
})

// 3. 正在输入
socket.emit('support:typing', { conversationId })

// 4. 标记已读
socket.emit('support:read', { conversationId, messageId })

// 5. 离开对话
socket.emit('support:leave', { conversationId })
```

#### 服务器 → 客户端

```typescript
// 1. 新消息
socket.on('support:message', (message: ChatMessage) => {})

// 2. 消息已读通知
socket.on('support:message-read', { messageId, readAt })

// 3. 对方正在输入
socket.on('support:typing', { senderType, senderName })

// 4. 对话状态更新
socket.on('support:conversation-status', { conversationId, status })

// 5. 管理员上线/下线
socket.on('support:admin-status', { adminId, online: boolean })

// 6. 加入房间确认
socket.on('support:joined', { conversationId, roomName })
```

## 5. 模块结构设计

```
backend/src/support/
├── support.module.ts           # 模块定义
├── support.controller.ts       # REST API 控制器
├── support.service.ts          # 业务逻辑服务
├── support.gateway.ts          # WebSocket 网关
├── dto/
│   ├── create-conversation.dto.ts
│   ├── send-message.dto.ts
│   ├── get-messages.dto.ts
│   └── update-conversation.dto.ts
├── entities/
│   ├── conversation.entity.ts
│   └── message.entity.ts
└── interceptors/
    └── file-upload.interceptor.ts
```

## 6. 实现要点

### 6.1 实时通信房间设计

```typescript
// 房间命名规则
const roomName = `support:conversation:${conversationId}`;

// 用户加入房间
socket.join(roomName);

// 发送消息到房间
this.server.to(roomName).emit('support:message', message);
```

### 6.2 文件上传配置

```typescript
// 图片上传配置
{
  dest: './uploads/support-images',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式'), false);
    }
  }
}
```

### 6.3 未读消息计数逻辑

```typescript
// 发送消息时更新未读计数
if (senderType === 'user') {
  conversation.unreadAdminCount += 1;
} else {
  conversation.unreadUserCount += 1;
}

// 标记已读时清零
if (readerType === 'admin') {
  conversation.unreadAdminCount = 0;
} else {
  conversation.unreadUserCount = 0;
}
```

### 6.4 在线状态管理

```typescript
// 使用 Redis 或内存存储在线状态
const onlineAdmins = new Map<string, Socket>();

// 管理员连接时
onlineAdmins.set(adminId, socket);

// 管理员断开时
onlineAdmins.delete(adminId);

// 广播管理员上线状态
this.server.emit('support:admin-status', {
  adminId,
  online: onlineAdmins.has(adminId)
});
```

## 7. 安全考虑

### 7.1 权限控制

```typescript
// 用户只能访问自己的对话
if (conversation.userId !== requestUser.id) {
  throw new ForbiddenException('无权访问此对话');
}

// 管理员可以访问所有对话
@Roles('admin')
```

### 7.2 消息内容过滤

```typescript
// XSS 防护
import * as sanitizeHtml from 'sanitize-html';

const sanitizedContent = sanitizeHtml(content, {
  allowedTags: [], // 不允许任何 HTML 标签
  allowedAttributes: {}
});
```

### 7.3 频率限制

```typescript
// 使用 @nestjs/throttler
@Throttle(10, 60) // 60秒内最多10条消息
async sendMessage() {}
```

### 7.4 图片安全检查

```typescript
// 检查图片真实性（防止伪造扩展名）
import * as fileType from 'file-type';

const type = await fileType.fromFile(filePath);
if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
  throw new BadRequestException('无效的图片文件');
}
```

## 8. 性能优化

### 8.1 消息分页加载

```typescript
// 使用游标分页（cursor-based pagination）
{
  cursor: lastMessageId,
  limit: 50,
  order: 'DESC'
}
```

### 8.2 消息缓存

```typescript
// 使用 Redis 缓存最近的消息
const cacheKey = `support:messages:${conversationId}:recent`;
await redis.setex(cacheKey, 3600, JSON.stringify(messages));
```

### 8.3 图片压缩

```typescript
// 使用 sharp 压缩图片
import * as sharp from 'sharp';

await sharp(inputPath)
  .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toFile(outputPath);
```

## 9. 监控与日志

### 9.1 消息统计

```typescript
// 记录关键指标
- 每日消息总量
- 平均响应时间
- 对话完成率
- 用户满意度（可选）
```

### 9.2 异常监控

```typescript
// 记录异常事件
- WebSocket 连接失败
- 消息发送失败
- 文件上传失败
- 数据库操作失败
```

## 10. 测试策略

### 10.1 单元测试

```typescript
- ChatService.createConversation()
- ChatService.sendMessage()
- ChatService.markAsRead()
```

### 10.2 集成测试

```typescript
- REST API 端点测试
- WebSocket 事件测试
- 文件上传测试
```

### 10.3 E2E 测试

```typescript
- 完整对话流程测试
- 多用户并发测试
- 断线重连测试
```

## 11. 实施步骤

### Phase 1: 基础架构（1-2天）
1. ✅ 数据库 Schema 设计与迁移
2. ✅ 创建 Support 模块
3. ✅ 实现基础 Service 和 Controller

### Phase 2: 核心功能（2-3天）
4. ✅ 实现消息发送/接收
5. ✅ 实现 WebSocket 事件处理
6. ✅ 实现文件上传功能

### Phase 3: 高级功能（1-2天）
7. ✅ 实现未读消息计数
8. ✅ 实现在线状态管理
9. ✅ 实现消息已读状态

### Phase 4: 优化与测试（1-2天）
10. ✅ 性能优化
11. ✅ 安全加固
12. ✅ 编写测试用例

## 12. 前端集成示例

### 12.1 连接 WebSocket

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken
  }
});

// 加入对话
socket.emit('support:join', {
  conversationId: 'xxx',
  userType: 'user'
});

// 监听新消息
socket.on('support:message', (message) => {
  addMessageToUI(message);
});
```

### 12.2 发送消息

```typescript
// 发送文字消息
socket.emit('support:message', {
  conversationId,
  messageType: 'text',
  content: '你好，我需要帮助'
});

// 上传并发送图片
const formData = new FormData();
formData.append('image', file);

const response = await fetch('/api/support/upload-image', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { imageUrl } = await response.json();

socket.emit('support:message', {
  conversationId,
  messageType: 'image',
  content: imageUrl
});
```

## 13. 后续扩展

### 可选功能
- 📎 支持文件附件（PDF、文档等）
- 🎙️ 语音消息
- 📹 视频通话
- 🤖 智能客服机器人（AI 自动回复）
- 📊 客服工作台仪表板
- ⭐ 服务评价系统
- 🏷️ 对话标签分类
- 📧 邮件通知
- 📱 移动推送通知

## 14. 参考资料

- [Socket.IO Documentation](https://socket.io/docs/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Multer File Upload](https://github.com/expressjs/multer)
