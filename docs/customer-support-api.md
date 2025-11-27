# 客服对话系统 API 文档

## 概述

客服对话系统提供了用户与管理员之间的实时即时通信功能，支持文字和图片消息。

**基础 URL**: `http://localhost:3000/api`

**认证方式**: Bearer Token (JWT)

---

## 用户端 API

### 1. 获取或创建对话

获取当前用户的活跃对话，如果不存在则自动创建一个新对话。

**请求**
```
GET /support/conversation
Authorization: Bearer {user_token}
```

**响应**
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "用户名",
    "adminId": null,
    "adminName": null,
    "status": "PENDING",
    "unreadUserCount": 0,
    "unreadAdminCount": 0,
    "lastMessageAt": null,
    "lastMessage": null,
    "lastMessageType": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "closedAt": null,
    "messages": []
  }
}
```

**对话状态说明**
- `PENDING`: 待处理（用户刚创建，等待管理员接管）
- `ACTIVE`: 处理中（管理员已接管）
- `CLOSED`: 已关闭

---

### 2. 获取消息历史

获取指定对话的消息历史记录。

**请求**
```
GET /support/messages?conversationId={id}&limit=50&offset=0
Authorization: Bearer {user_token}
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 对话 ID |
| limit | number | 否 | 每页数量，默认 50 |
| offset | number | 否 | 偏移量，默认 0 |

**响应**
```json
{
  "data": {
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "senderId": "uuid",
        "senderType": "USER",
        "senderName": "用户名",
        "messageType": "TEXT",
        "content": "消息内容",
        "metadata": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 10,
    "hasMore": false
  }
}
```

**消息类型说明**
- `TEXT`: 文字消息
- `IMAGE`: 图片消息
- `SYSTEM`: 系统消息

**发送者类型说明**
- `USER`: 用户
- `ADMIN`: 管理员
- `SYSTEM`: 系统

---

### 3. 上传图片

上传图片用于发送图片消息。

**请求**
```
POST /support/upload-image
Authorization: Bearer {user_token}
Content-Type: multipart/form-data

Body:
  image: File (JPEG, PNG, GIF, WebP, 最大 5MB)
```

**响应**
```json
{
  "data": {
    "imageUrl": "/uploads/support-images/abc123.jpg",
    "filename": "abc123.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  }
}
```

---

### 4. 标记消息已读

将对话中的所有未读消息标记为已读。

**请求**
```
PUT /support/messages/read
Authorization: Bearer {user_token}
Content-Type: application/json

Body:
{
  "conversationId": "uuid"
}
```

**响应**
```json
{
  "message": "已标记为已读"
}
```

---

### 5. 关闭对话

用户主动关闭对话。

**请求**
```
POST /support/conversation/{id}/close
Authorization: Bearer {user_token}
```

**响应**
```json
{
  "message": "对话已关闭"
}
```

---

### 6. 获取历史对话列表

获取用户的所有对话（包括已关闭的）。

**请求**
```
GET /support/conversations?limit=10
Authorization: Bearer {user_token}
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 数量限制，默认 10 |

**响应**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "用户名",
      "adminId": "uuid",
      "adminName": "管理员名",
      "status": "ACTIVE",
      "unreadUserCount": 2,
      "unreadAdminCount": 0,
      "lastMessageAt": "2025-01-01T00:00:00.000Z",
      "lastMessage": "最后一条消息",
      "lastMessageType": "TEXT",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "closedAt": null
    }
  ]
}
```

---

## 管理员端 API

### 1. 获取对话列表

获取所有用户的对话列表，支持按状态过滤。

**请求**
```
GET /admin/support/conversations?status=PENDING&page=1&limit=20
Authorization: Bearer {admin_token}
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 对话状态：PENDING, ACTIVE, CLOSED |
| adminId | string | 否 | 按管理员 ID 过滤 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应**
```json
{
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "userId": "uuid",
        "userName": "用户名",
        "adminId": "uuid",
        "adminName": "管理员名",
        "status": "PENDING",
        "unreadUserCount": 0,
        "unreadAdminCount": 1,
        "lastMessageAt": "2025-01-01T00:00:00.000Z",
        "lastMessage": "最后一条消息",
        "lastMessageType": "TEXT",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z",
        "closedAt": null,
        "user": {
          "id": "uuid",
          "displayName": "用户名",
          "email": "user@example.com",
          "avatar": "/uploads/avatars/abc.jpg"
        }
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

### 2. 获取对话详情

获取单个对话的详细信息，包括所有消息。

**请求**
```
GET /admin/support/conversations/{id}
Authorization: Bearer {admin_token}
```

**响应**
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "用户名",
    "adminId": "uuid",
    "adminName": "管理员名",
    "status": "ACTIVE",
    "unreadUserCount": 0,
    "unreadAdminCount": 0,
    "lastMessageAt": "2025-01-01T00:00:00.000Z",
    "lastMessage": "最后一条消息",
    "lastMessageType": "TEXT",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "closedAt": null,
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "senderId": "uuid",
        "senderType": "USER",
        "senderName": "用户名",
        "messageType": "TEXT",
        "content": "消息内容",
        "metadata": null,
        "isRead": true,
        "readAt": "2025-01-01T00:00:00.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "user": {
      "id": "uuid",
      "displayName": "用户名",
      "email": "user@example.com",
      "avatar": "/uploads/avatars/abc.jpg"
    }
  }
}
```

---

### 3. 接管对话

管理员接管一个待处理的对话。

**请求**
```
POST /admin/support/conversations/{id}/assign
Authorization: Bearer {admin_token}
```

**响应**
```json
{
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "userName": "用户名",
    "adminId": "uuid",
    "adminName": "管理员名",
    "status": "ACTIVE",
    "unreadUserCount": 0,
    "unreadAdminCount": 0,
    "lastMessageAt": "2025-01-01T00:00:00.000Z",
    "lastMessage": "管理员名 已加入对话",
    "lastMessageType": "SYSTEM",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "closedAt": null,
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "senderId": "uuid",
        "senderType": "SYSTEM",
        "senderName": "System",
        "messageType": "SYSTEM",
        "content": "管理员名 已加入对话",
        "metadata": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. 发送消息

管理员发送消息给用户。

**请求**
```
POST /admin/support/messages
Authorization: Bearer {admin_token}
Content-Type: application/json

Body:
{
  "conversationId": "uuid",
  "messageType": "TEXT",
  "content": "您好，有什么可以帮助您的吗？",
  "metadata": null
}
```

**响应**
```json
{
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "senderType": "ADMIN",
    "senderName": "管理员名",
    "messageType": "TEXT",
    "content": "您好，有什么可以帮助您的吗？",
    "metadata": null,
    "isRead": false,
    "readAt": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 5. 上传图片

管理员上传图片用于发送图片消息。

**请求**
```
POST /admin/support/upload-image
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

Body:
  image: File (JPEG, PNG, GIF, WebP, 最大 5MB)
```

**响应**
```json
{
  "data": {
    "imageUrl": "/uploads/support-images/abc123.jpg",
    "filename": "abc123.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  }
}
```

---

### 6. 关闭对话

管理员关闭对话。

**请求**
```
POST /admin/support/conversations/{id}/close
Authorization: Bearer {admin_token}
```

**响应**
```json
{
  "message": "对话已关闭"
}
```

---

### 7. 获取未读消息统计

获取管理员的未读消息统计。

**请求**
```
GET /admin/support/unread-count?adminId={id}
Authorization: Bearer {admin_token}
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| adminId | string | 否 | 管理员 ID，不传则统计所有 |

**响应**
```json
{
  "data": {
    "totalUnread": 5,
    "conversationCount": 3
  }
}
```

---

## WebSocket 实时通信

### 连接

**命名空间**: `/support`

**连接示例**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/support', {
  auth: {
    token: accessToken
  }
});
```

---

### 客户端发送事件

#### 1. 加入对话房间

```javascript
socket.emit('support:join', {
  conversationId: 'uuid',
  userType: 'user' // 或 'admin'
});

// 服务器响应
socket.on('support:joined', (data) => {
  console.log('已加入房间:', data.roomName);
});
```

#### 2. 发送消息

```javascript
socket.emit('support:message', {
  conversationId: 'uuid',
  senderId: 'uuid',
  senderType: 'USER', // 或 'ADMIN'
  senderName: '用户名',
  messageType: 'TEXT', // 或 'IMAGE'
  content: '消息内容'
});
```

#### 3. 正在输入

```javascript
socket.emit('support:typing', {
  conversationId: 'uuid',
  senderType: 'USER',
  senderName: '用户名'
});
```

#### 4. 标记已读

```javascript
socket.emit('support:read', {
  conversationId: 'uuid',
  readerType: 'user' // 或 'admin'
});
```

#### 5. 离开对话

```javascript
socket.emit('support:leave', {
  conversationId: 'uuid'
});
```

---

### 服务器推送事件

#### 1. 新消息

```javascript
socket.on('support:message', (message) => {
  console.log('收到新消息:', message);
  // message 结构同 API 返回的消息对象
});
```

#### 2. 消息已读通知

```javascript
socket.on('support:messages-read', (data) => {
  console.log('消息已读:', data);
  // data: { conversationId, readerType, readAt }
});
```

#### 3. 对方正在输入

```javascript
socket.on('support:typing', (data) => {
  console.log('对方正在输入:', data);
  // data: { senderType, senderName }
});
```

#### 4. 对话状态更新

```javascript
socket.on('support:conversation-status', (data) => {
  console.log('对话状态更新:', data);
  // data: { conversationId, status }
});
```

#### 5. 管理员在线状态

```javascript
socket.on('support:admin-status', (data) => {
  console.log('管理员状态:', data);
  // data: { adminId, online: true/false }
});
```

#### 6. 错误通知

```javascript
socket.on('support:error', (error) => {
  console.error('WebSocket 错误:', error);
  // error: { message: '错误信息' }
});
```

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（Token 无效或过期） |
| 403 | 禁止访问（无权限） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 使用流程示例

### 用户端流程

1. 用户登录获取 Token
2. 调用 `GET /support/conversation` 获取或创建对话
3. 连接 WebSocket 并加入房间
4. 通过 WebSocket 发送消息
5. 监听 WebSocket 接收管理员消息
6. 标记消息为已读
7. 关闭对话（可选）

### 管理员端流程

1. 管理员登录获取 Token
2. 调用 `GET /admin/support/conversations?status=PENDING` 获取待处理对话
3. 调用 `POST /admin/support/conversations/{id}/assign` 接管对话
4. 连接 WebSocket 并加入房间
5. 通过 WebSocket 或 REST API 发送消息
6. 监听 WebSocket 接收用户消息
7. 关闭对话

---

## 注意事项

1. **认证**: 所有 API 都需要在 Header 中携带 `Authorization: Bearer {token}`
2. **图片上传**: 仅支持 JPEG、PNG、GIF、WebP 格式，最大 5MB
3. **实时通信**: 建议优先使用 WebSocket 进行消息发送和接收，REST API 作为备用
4. **未读计数**: 用户和管理员分别维护未读计数
5. **对话状态**: PENDING → ACTIVE → CLOSED 是正常的状态流转
6. **消息历史**: 支持分页加载，默认每页 50 条

---

## 测试脚本

完整的测试脚本位于 `/tmp/test_support_chat_v3.sh`，包含：

- 用户注册/登录
- 创建对话
- 管理员登录
- 管理员接管对话
- 发送消息
- 获取消息历史
- 标记已读
- 未读统计
- 关闭对话

运行测试：
```bash
chmod +x /tmp/test_support_chat_v3.sh
./tmp/test_support_chat_v3.sh
```
