# 客服聊天系统 API 文档

## 概述

客服聊天系统提供用户与客服之间的实时在线聊天功能。

- **用户端**: 用户可以发起对话、发送消息、上传图片、查看历史消息
- **管理员端**: 管理员可以接管对话、回复用户、查看所有对话、获取未读统计
- **消息类型**: 支持文本、图片、系统通知等多种消息类型
- **自动分配**: 新对话可自动分配给在线客服

## 基础 URL

```
开发环境: http://localhost:3000/api
生产环境: https://your-domain.com/api
```

---

## 用户端 API

### 1. 获取或创建对话

用户第一次访问客服时调用此接口，会自动创建对话。后续访问返回已有对话。

**接口**
```
GET /api/support/conversation
```

**权限**: 需要用户登录

**请求头**
```
Authorization: Bearer {user_token}
```

**请求示例**
```bash
curl -X GET http://localhost:3000/api/support/conversation \
  -H "Authorization: Bearer {user_token}"
```

**响应示例**
```json
{
  "id": "conv-123",
  "userId": "user-456",
  "userName": "张三",
  "status": "ACTIVE",
  "assignedAdminId": null,
  "assignedAdminName": null,
  "userUnreadCount": 0,
  "adminUnreadCount": 0,
  "lastMessageAt": "2025-01-14T10:30:00.000Z",
  "createdAt": "2025-01-14T10:00:00.000Z",
  "updatedAt": "2025-01-14T10:30:00.000Z"
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 对话 ID |
| userId | string | 用户 ID |
| userName | string | 用户名称 |
| status | enum | 对话状态: ACTIVE（进行中）, CLOSED（已关闭） |
| assignedAdminId | string | 接管的客服 ID（未分配时为 null） |
| assignedAdminName | string | 接管的客服名称 |
| userUnreadCount | int | 用户未读消息数 |
| adminUnreadCount | int | 客服未读消息数 |
| lastMessageAt | datetime | 最后一条消息时间 |

---

### 2. 获取消息历史

获取对话的历史消息，支持分页和偏移量加载。

**接口**
```
GET /api/support/messages
```

**权限**: 需要用户登录

**请求头**
```
Authorization: Bearer {user_token}
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| conversationId | string | 是 | - | 对话 ID |
| limit | int | 否 | 50 | 获取消息数量（最大 100） |
| offset | int | 否 | 0 | 偏移量（用于分页） |

**请求示例**
```bash
curl -X GET "http://localhost:3000/api/support/messages?conversationId=conv-123&limit=20&offset=0" \
  -H "Authorization: Bearer {user_token}"
```

**响应示例**
```json
{
  "data": [
    {
      "id": "msg-001",
      "conversationId": "conv-123",
      "senderId": "user-456",
      "senderType": "USER",
      "senderName": "张三",
      "messageType": "TEXT",
      "content": "你好，我想咨询一下充值问题",
      "metadata": null,
      "isRead": true,
      "createdAt": "2025-01-14T10:00:00.000Z"
    },
    {
      "id": "msg-002",
      "conversationId": "conv-123",
      "senderId": "admin-789",
      "senderType": "ADMIN",
      "senderName": "客服小王",
      "messageType": "TEXT",
      "content": "您好！请问您遇到什么充值问题呢？",
      "metadata": null,
      "isRead": true,
      "createdAt": "2025-01-14T10:01:00.000Z"
    },
    {
      "id": "msg-003",
      "conversationId": "conv-123",
      "senderId": "user-456",
      "senderType": "USER",
      "senderName": "张三",
      "messageType": "IMAGE",
      "content": "/uploads/support-images/img-123.jpg",
      "metadata": {
        "filename": "screenshot.png",
        "size": 245678,
        "mimeType": "image/png"
      },
      "isRead": false,
      "createdAt": "2025-01-14T10:02:00.000Z"
    }
  ],
  "total": 15,
  "hasMore": false
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| senderId | string | 发送者 ID |
| senderType | enum | 发送者类型: USER（用户）, ADMIN（客服）, SYSTEM（系统） |
| senderName | string | 发送者名称 |
| messageType | enum | 消息类型: TEXT（文本）, IMAGE（图片）, SYSTEM（系统通知） |
| content | string | 消息内容（文本消息是文本，图片消息是 URL） |
| metadata | json | 消息元数据（图片消息包含文件信息） |
| isRead | boolean | 是否已读 |

---

### 3. 发送消息（通过 WebSocket）

> **注意**: 用户发送消息应通过 WebSocket 实现。如果需要 HTTP 接口，可以添加相应的 POST 端点。

**WebSocket 连接**
```
ws://localhost:3000/chat?token={user_token}
```

**发送消息事件**
```json
{
  "event": "sendMessage",
  "data": {
    "conversationId": "conv-123",
    "messageType": "TEXT",
    "content": "你好，我想咨询一下充值问题"
  }
}
```

**接收消息事件**
```json
{
  "event": "newMessage",
  "data": {
    "id": "msg-001",
    "conversationId": "conv-123",
    "senderId": "admin-789",
    "senderType": "ADMIN",
    "senderName": "客服小王",
    "messageType": "TEXT",
    "content": "您好！请问您遇到什么充值问题呢？",
    "createdAt": "2025-01-14T10:01:00.000Z"
  }
}
```

---

### 4. 上传图片

上传聊天图片，返回图片 URL。

**接口**
```
POST /api/support/upload-image
```

**权限**: 需要用户登录

**请求头**
```
Authorization: Bearer {user_token}
Content-Type: multipart/form-data
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | 是 | 图片文件（支持 jpg, png, gif, 最大 5MB） |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/support/upload-image \
  -H "Authorization: Bearer {user_token}" \
  -F "image=@/path/to/image.png"
```

**响应示例**
```json
{
  "imageUrl": "/uploads/support-images/1705225200000-abc123.png",
  "filename": "1705225200000-abc123.png",
  "size": 245678,
  "mimeType": "image/png"
}
```

**使用流程**

1. 调用上传接口获取 imageUrl
2. 通过 WebSocket 发送 IMAGE 类型消息，content 为 imageUrl
3. 在消息中附加 metadata 包含文件信息

---

### 5. 标记消息已读

标记对话中的消息为已读状态。

**接口**
```
PUT /api/support/messages/read
```

**权限**: 需要用户登录

**请求头**
```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 对话 ID |

**请求示例**
```bash
curl -X PUT http://localhost:3000/api/support/messages/read \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123"
  }'
```

**响应示例**
```json
{
  "message": "已标记为已读"
}
```

---

### 6. 关闭对话

用户主动关闭对话。关闭后不能继续发送消息。

**接口**
```
POST /api/support/conversation/:id/close
```

**权限**: 需要用户登录

**请求头**
```
Authorization: Bearer {user_token}
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 对话 ID |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/support/conversation/conv-123/close \
  -H "Authorization: Bearer {user_token}"
```

**响应示例**
```json
{
  "message": "对话已关闭"
}
```

---

### 7. 获取用户的所有对话

获取用户的历史对话列表，包括已关闭的对话。

**接口**
```
GET /api/support/conversations
```

**权限**: 需要用户登录

**请求头**
```
Authorization: Bearer {user_token}
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | int | 否 | 10 | 获取对话数量 |

**请求示例**
```bash
curl -X GET "http://localhost:3000/api/support/conversations?limit=5" \
  -H "Authorization: Bearer {user_token}"
```

**响应示例**
```json
[
  {
    "id": "conv-123",
    "userId": "user-456",
    "userName": "张三",
    "status": "ACTIVE",
    "assignedAdminId": "admin-789",
    "assignedAdminName": "客服小王",
    "userUnreadCount": 2,
    "adminUnreadCount": 0,
    "lastMessageAt": "2025-01-14T10:30:00.000Z",
    "createdAt": "2025-01-14T10:00:00.000Z",
    "updatedAt": "2025-01-14T10:30:00.000Z"
  },
  {
    "id": "conv-122",
    "userId": "user-456",
    "userName": "张三",
    "status": "CLOSED",
    "assignedAdminId": "admin-788",
    "assignedAdminName": "客服小李",
    "userUnreadCount": 0,
    "adminUnreadCount": 0,
    "lastMessageAt": "2025-01-13T15:20:00.000Z",
    "createdAt": "2025-01-13T14:00:00.000Z",
    "updatedAt": "2025-01-13T15:20:00.000Z"
  }
]
```

---

## 管理员 API

### 8. 获取对话列表

获取所有用户的对话列表，支持筛选和分页。

**接口**
```
GET /api/admin/support/conversations
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| status | string | 否 | - | 对话状态筛选: ACTIVE, CLOSED |
| adminId | string | 否 | - | 筛选指定客服的对话 |
| page | int | 否 | 1 | 页码 |
| limit | int | 否 | 20 | 每页数量 |

**请求示例**
```bash
curl -X GET "http://localhost:3000/api/admin/support/conversations?status=ACTIVE&page=1&limit=20" \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "data": [
    {
      "id": "conv-123",
      "userId": "user-456",
      "userName": "张三",
      "status": "ACTIVE",
      "assignedAdminId": "admin-789",
      "assignedAdminName": "客服小王",
      "userUnreadCount": 0,
      "adminUnreadCount": 3,
      "lastMessageAt": "2025-01-14T10:30:00.000Z",
      "createdAt": "2025-01-14T10:00:00.000Z",
      "updatedAt": "2025-01-14T10:30:00.000Z",
      "user": {
        "id": "user-456",
        "displayName": "张三",
        "email": "zhangsan@example.com",
        "avatar": "/uploads/avatars/user-456.jpg"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "pageSize": 20,
  "totalPages": 2
}
```

---

### 9. 获取对话详情

获取单个对话的详细信息，包括完整的消息历史。

**接口**
```
GET /api/admin/support/conversations/:id
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 对话 ID |

**请求示例**
```bash
curl -X GET http://localhost:3000/api/admin/support/conversations/conv-123 \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "id": "conv-123",
  "userId": "user-456",
  "userName": "张三",
  "status": "ACTIVE",
  "assignedAdminId": "admin-789",
  "assignedAdminName": "客服小王",
  "userUnreadCount": 0,
  "adminUnreadCount": 3,
  "lastMessageAt": "2025-01-14T10:30:00.000Z",
  "createdAt": "2025-01-14T10:00:00.000Z",
  "updatedAt": "2025-01-14T10:30:00.000Z",
  "user": {
    "id": "user-456",
    "displayName": "张三",
    "email": "zhangsan@example.com",
    "avatar": "/uploads/avatars/user-456.jpg"
  },
  "messages": [
    {
      "id": "msg-001",
      "conversationId": "conv-123",
      "senderId": "user-456",
      "senderType": "USER",
      "senderName": "张三",
      "messageType": "TEXT",
      "content": "你好，我想咨询一下充值问题",
      "metadata": null,
      "isRead": true,
      "createdAt": "2025-01-14T10:00:00.000Z"
    },
    {
      "id": "msg-002",
      "conversationId": "conv-123",
      "senderId": "admin-789",
      "senderType": "ADMIN",
      "senderName": "客服小王",
      "messageType": "TEXT",
      "content": "您好！请问您遇到什么充值问题呢？",
      "metadata": null,
      "isRead": true,
      "createdAt": "2025-01-14T10:01:00.000Z"
    }
  ]
}
```

---

### 10. 接管对话

客服接管用户对话，开始提供服务。

**接口**
```
POST /api/admin/support/conversations/:id/assign
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 对话 ID |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/support/conversations/conv-123/assign \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "id": "conv-123",
  "userId": "user-456",
  "userName": "张三",
  "status": "ACTIVE",
  "assignedAdminId": "admin-789",
  "assignedAdminName": "客服小王",
  "userUnreadCount": 0,
  "adminUnreadCount": 3,
  "lastMessageAt": "2025-01-14T10:30:00.000Z",
  "createdAt": "2025-01-14T10:00:00.000Z",
  "updatedAt": "2025-01-14T10:30:00.000Z"
}
```

**说明**

- 接管后，对话会绑定到当前客服
- 系统会发送一条系统消息通知用户

---

### 11. 发送消息（管理员）

客服发送消息给用户。

**接口**
```
POST /api/admin/support/messages
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 对话 ID |
| messageType | enum | 是 | 消息类型: TEXT, IMAGE |
| content | string | 是 | 消息内容（文本或图片 URL） |
| metadata | json | 否 | 消息元数据 |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/support/messages \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123",
    "messageType": "TEXT",
    "content": "您好！请问您遇到什么充值问题呢？"
  }'
```

**响应示例**
```json
{
  "id": "msg-002",
  "conversationId": "conv-123",
  "senderId": "admin-789",
  "senderType": "ADMIN",
  "senderName": "客服小王",
  "messageType": "TEXT",
  "content": "您好！请问您遇到什么充值问题呢？",
  "metadata": null,
  "isRead": false,
  "createdAt": "2025-01-14T10:01:00.000Z"
}
```

**发送图片消息示例**
```bash
# 1. 先上传图片
curl -X POST http://localhost:3000/api/admin/support/upload-image \
  -H "Authorization: Bearer {admin_token}" \
  -F "image=@/path/to/image.png"

# 2. 发送图片消息
curl -X POST http://localhost:3000/api/admin/support/messages \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123",
    "messageType": "IMAGE",
    "content": "/uploads/support-images/1705225200000-abc123.png",
    "metadata": {
      "filename": "screenshot.png",
      "size": 245678,
      "mimeType": "image/png"
    }
  }'
```

---

### 12. 上传图片（管理员）

客服上传聊天图片，返回图片 URL。

**接口**
```
POST /api/admin/support/upload-image
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | 是 | 图片文件（支持 jpg, png, gif, 最大 5MB） |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/support/upload-image \
  -H "Authorization: Bearer {admin_token}" \
  -F "image=@/path/to/image.png"
```

**响应示例**
```json
{
  "imageUrl": "/uploads/support-images/1705225200000-abc123.png",
  "filename": "1705225200000-abc123.png",
  "size": 245678,
  "mimeType": "image/png"
}
```

---

### 13. 关闭对话（管理员）

客服关闭对话。

**接口**
```
POST /api/admin/support/conversations/:id/close
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 对话 ID |

**请求示例**
```bash
curl -X POST http://localhost:3000/api/admin/support/conversations/conv-123/close \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "message": "对话已关闭"
}
```

---

### 14. 获取未读消息统计

获取客服的未读消息总数，用于显示红点提示。

**接口**
```
GET /api/admin/support/unread-count
```

**权限**: 需要管理员权限（admin）

**请求头**
```
Authorization: Bearer {admin_token}
```

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| adminId | string | 否 | - | 指定客服 ID（为空时返回所有未读） |

**请求示例**
```bash
curl -X GET "http://localhost:3000/api/admin/support/unread-count?adminId=admin-789" \
  -H "Authorization: Bearer {admin_token}"
```

**响应示例**
```json
{
  "total": 15,
  "byConversation": [
    {
      "conversationId": "conv-123",
      "count": 3
    },
    {
      "conversationId": "conv-124",
      "count": 5
    },
    {
      "conversationId": "conv-125",
      "count": 7
    }
  ]
}
```

---

## WebSocket 实时通信

### 连接 WebSocket

**用户端**
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: userToken
  }
});
```

**管理员端**
```javascript
const socket = io('http://localhost:3000/admin/chat', {
  auth: {
    token: adminToken
  }
});
```

### 事件列表

#### 客户端发送事件

**1. 加入对话**
```json
{
  "event": "joinConversation",
  "data": {
    "conversationId": "conv-123"
  }
}
```

**2. 发送消息**
```json
{
  "event": "sendMessage",
  "data": {
    "conversationId": "conv-123",
    "messageType": "TEXT",
    "content": "你好，我想咨询一下充值问题"
  }
}
```

**3. 标记已读**
```json
{
  "event": "markAsRead",
  "data": {
    "conversationId": "conv-123"
  }
}
```

**4. 正在输入**
```json
{
  "event": "typing",
  "data": {
    "conversationId": "conv-123"
  }
}
```

#### 服务端推送事件

**1. 新消息**
```json
{
  "event": "newMessage",
  "data": {
    "id": "msg-001",
    "conversationId": "conv-123",
    "senderId": "admin-789",
    "senderType": "ADMIN",
    "senderName": "客服小王",
    "messageType": "TEXT",
    "content": "您好！请问您遇到什么充值问题呢？",
    "createdAt": "2025-01-14T10:01:00.000Z"
  }
}
```

**2. 消息已读**
```json
{
  "event": "messageRead",
  "data": {
    "conversationId": "conv-123",
    "readBy": "USER"
  }
}
```

**3. 对方正在输入**
```json
{
  "event": "userTyping",
  "data": {
    "conversationId": "conv-123",
    "userName": "张三"
  }
}
```

**4. 对话状态变化**
```json
{
  "event": "conversationStatusChanged",
  "data": {
    "conversationId": "conv-123",
    "status": "CLOSED"
  }
}
```

**5. 客服接管**
```json
{
  "event": "adminAssigned",
  "data": {
    "conversationId": "conv-123",
    "adminId": "admin-789",
    "adminName": "客服小王"
  }
}
```

---

## 数据模型

### ChatConversation（对话）

```typescript
{
  id: string;                    // UUID
  userId: string;                // 用户 ID
  userName: string;              // 用户名称
  status: ConversationStatus;    // 对话状态
  assignedAdminId?: string;      // 接管的客服 ID
  assignedAdminName?: string;    // 接管的客服名称
  userUnreadCount: number;       // 用户未读数
  adminUnreadCount: number;      // 客服未读数
  lastMessageAt?: Date;          // 最后消息时间
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];       // 消息列表
  user: User;                    // 关联的用户
}
```

### ChatMessage（消息）

```typescript
{
  id: string;                    // UUID
  conversationId: string;        // 所属对话 ID
  senderId: string;              // 发送者 ID
  senderType: SenderType;        // 发送者类型
  senderName: string;            // 发送者名称
  messageType: MessageType;      // 消息类型
  content: string;               // 消息内容
  metadata?: any;                // 消息元数据
  isRead: boolean;               // 是否已读
  createdAt: Date;
}
```

### 枚举类型

```typescript
enum ConversationStatus {
  ACTIVE = 'ACTIVE',     // 进行中
  CLOSED = 'CLOSED'      // 已关闭
}

enum SenderType {
  USER = 'USER',         // 用户
  ADMIN = 'ADMIN',       // 客服
  SYSTEM = 'SYSTEM'      // 系统
}

enum MessageType {
  TEXT = 'TEXT',         // 文本
  IMAGE = 'IMAGE',       // 图片
  SYSTEM = 'SYSTEM'      // 系统通知
}
```

---

## 业务流程

### 用户发起对话流程

```
1. 用户点击"联系客服"
   ↓
2. 调用 GET /api/support/conversation（获取或创建对话）
   ↓
3. 建立 WebSocket 连接
   ↓
4. 加入对话房间（joinConversation）
   ↓
5. 调用 GET /api/support/messages 加载历史消息
   ↓
6. 用户发送消息（通过 WebSocket 或 HTTP）
   ↓
7. 接收客服回复（WebSocket 推送）
```

### 客服接管对话流程

```
1. 客服打开对话列表
   ↓
2. 调用 GET /api/admin/support/conversations（获取待处理对话）
   ↓
3. 点击对话查看详情
   ↓
4. 调用 POST /api/admin/support/conversations/:id/assign（接管对话）
   ↓
5. 建立 WebSocket 连接
   ↓
6. 加入对话房间
   ↓
7. 发送消息给用户
   ↓
8. 处理完成后关闭对话
```

---

## 配置说明

### 图片上传配置

**支持的图片格式**: jpg, jpeg, png, gif

**文件大小限制**: 5MB

**存储路径**: `/uploads/support-images/`

**文件命名规则**: `{timestamp}-{randomString}.{ext}`

### 消息历史保留

根据系统配置，消息历史会定期清理：

- **ACTIVE 对话**: 保留所有消息
- **CLOSED 对话**: 保留 30 天（可配置）
- **超期对话**: 自动删除

---

## 常见问题

**Q: 用户如何发起对话？**

A: 用户调用 `GET /api/support/conversation` 接口，系统会自动创建对话。如果已有进行中的对话，则返回已有对话。

**Q: 客服如何知道有新对话？**

A: 客服可以通过以下方式：
1. 定期调用 `GET /api/admin/support/conversations` 获取对话列表
2. 通过 WebSocket 接收 `newConversation` 事件
3. 查看 `GET /api/admin/support/unread-count` 获取未读统计

**Q: 消息是否支持撤回？**

A: 当前版本不支持消息撤回。可以通过发送新消息说明之前的消息有误。

**Q: 对话关闭后还能继续聊天吗？**

A: 不能。对话关闭后，用户需要重新发起对话。

**Q: 图片存储在哪里？**

A: 图片存储在服务器的 `/uploads/support-images/` 目录。生产环境建议使用云存储（如 AWS S3）。

**Q: WebSocket 断线后如何重连？**

A: 客户端应实现自动重连机制。重连后需要重新加入对话房间（joinConversation）。

---

## 错误码

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | 请上传图片文件 | 上传图片时未提供文件 |
| 400 | 对话不存在 | 对话 ID 不存在 |
| 403 | 无权操作此对话 | 用户尝试操作不属于自己的对话 |
| 404 | 对话不存在 | 获取不存在的对话 |

---

## 安全建议

1. **图片上传**:
   - 验证文件类型和大小
   - 使用随机文件名防止覆盖
   - 图片存储路径与代码分离

2. **消息内容**:
   - 过滤敏感词
   - 防止 XSS 攻击（前端展示时转义 HTML）
   - 限制消息长度

3. **权限控制**:
   - 用户只能访问自己的对话
   - 验证 WebSocket 连接的 token
   - 管理员接口需要 admin 角色

4. **频率限制**:
   - 限制消息发送频率（防止刷屏）
   - 限制图片上传频率
   - 使用 rate limiting 中间件

---

## 更新日志

### v1.0.0 (2025-01-14)
- 初始版本
- 实现基础聊天功能
- 支持文本和图片消息
- 实现客服接管机制
- 实现未读消息统计
- WebSocket 实时通信
