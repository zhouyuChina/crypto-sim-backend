# 客服对话历史记录保留策略

## 业务场景分析

根据您的需求：
- ✅ 显示**处理中**的对话
- ✅ 显示**待处理**的对话
- ❓ 历史对话的保留策略

## 方案对比

### 方案 1：完全保留（推荐用于合规要求高的场景）

#### 特点
- 所有消息永久保存在数据库
- 支持完整的历史查询
- 便于问题追溯和审计

#### 数据结构
```prisma
model ChatConversation {
  id         String              @id @default(uuid())
  userId     String
  adminId    String?
  status     ConversationStatus  @default(PENDING) // PENDING/ACTIVE/CLOSED/ARCHIVED
  closedAt   DateTime?
  messages   ChatMessage[]

  @@index([status])
  @@index([userId, status])
}

enum ConversationStatus {
  PENDING   // 待处理（新对话，未分配管理员）
  ACTIVE    // 处理中（已分配管理员，正在对话）
  CLOSED    // 已关闭（对话结束）
  ARCHIVED  // 已归档（旧对话，不再显示）
}
```

#### 查询逻辑
```typescript
// 管理员后台：显示待处理和处理中的对话
async getActiveConversations() {
  return await prisma.chatConversation.findMany({
    where: {
      status: {
        in: ['PENDING', 'ACTIVE']
      }
    },
    orderBy: { lastMessageAt: 'desc' }
  });
}

// 查询历史记录（可选功能）
async getArchivedConversations(userId: string) {
  return await prisma.chatConversation.findMany({
    where: {
      userId,
      status: 'ARCHIVED'
    },
    orderBy: { closedAt: 'desc' }
  });
}
```

#### 优点
- ✅ 完整的历史记录，便于审计
- ✅ 用户可以查看完整对话历史
- ✅ 支持数据分析和质量监控
- ✅ 便于问题追溯和客户投诉处理

#### 缺点
- ❌ 数据库体积增长较快
- ❌ 需要定期维护和备份
- ❌ 查询性能可能受影响（需要索引优化）

#### 成本估算
```
假设：
- 每天 100 个对话
- 每个对话平均 20 条消息
- 每条消息平均 200 字节

一年数据量：
100 × 20 × 200 × 365 = 146 MB/年（纯文本）
加上图片和元数据：约 500 MB - 1 GB/年
```

---

### 方案 2：定期归档（推荐 ⭐）

#### 特点
- 活跃对话存储在主表
- 关闭的对话自动归档到历史表
- 平衡性能和完整性

#### 数据结构
```prisma
// 主表：活跃对话
model ChatConversation {
  id         String              @id @default(uuid())
  userId     String
  adminId    String?
  status     ConversationStatus  @default(PENDING)
  closedAt   DateTime?
  messages   ChatMessage[]

  @@index([status, lastMessageAt])
}

// 归档表：历史对话
model ChatConversationArchive {
  id                String   @id // 原对话 ID
  userId            String
  adminId           String?
  archivedAt        DateTime @default(now())
  messageCount      Int      // 消息总数
  conversationData  Json     // 完整对话数据（JSON 格式）

  @@index([userId, archivedAt])
  @@index([archivedAt])
}
```

#### 归档策略
```typescript
// 定时任务：每天凌晨归档 30 天前关闭的对话
@Cron('0 0 * * *') // 每天 00:00
async archiveOldConversations() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldConversations = await prisma.chatConversation.findMany({
    where: {
      status: 'CLOSED',
      closedAt: { lte: thirtyDaysAgo }
    },
    include: { messages: true }
  });

  for (const conversation of oldConversations) {
    // 1. 归档到历史表
    await prisma.chatConversationArchive.create({
      data: {
        id: conversation.id,
        userId: conversation.userId,
        adminId: conversation.adminId,
        messageCount: conversation.messages.length,
        conversationData: JSON.stringify(conversation)
      }
    });

    // 2. 删除主表数据
    await prisma.chatConversation.delete({
      where: { id: conversation.id }
    });
  }

  this.logger.log(`归档了 ${oldConversations.length} 个对话`);
}
```

#### 查询逻辑
```typescript
// 管理员后台：只查询活跃对话
async getActiveConversations() {
  return await prisma.chatConversation.findMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] }
    },
    orderBy: { lastMessageAt: 'desc' }
  });
}

// 用户查看历史（先查主表，再查归档表）
async getUserConversations(userId: string) {
  const active = await prisma.chatConversation.findMany({
    where: { userId },
    orderBy: { lastMessageAt: 'desc' },
    take: 10
  });

  const archived = await prisma.chatConversationArchive.findMany({
    where: { userId },
    orderBy: { archivedAt: 'desc' },
    take: 10
  });

  return { active, archived };
}
```

#### 优点
- ✅ 保留历史记录，满足审计需求
- ✅ 主表数据量小，查询速度快
- ✅ 灵活的归档周期（可配置）
- ✅ 可以恢复归档数据

#### 缺点
- ⚠️ 需要额外的归档逻辑
- ⚠️ 查询归档数据需要特殊处理
- ⚠️ 数据迁移需要测试

---

### 方案 3：自动清理（适合对历史无要求的场景）

#### 特点
- 关闭对话后 N 天自动删除
- 数据库体积最小
- 不保留长期历史

#### 数据结构
```prisma
model ChatConversation {
  id         String              @id @default(uuid())
  userId     String
  adminId    String?
  status     ConversationStatus  @default(PENDING)
  closedAt   DateTime?
  deleteAt   DateTime?           // 计划删除时间
  messages   ChatMessage[]

  @@index([status])
  @@index([deleteAt])
}
```

#### 清理策略
```typescript
// 对话关闭时设置删除时间
async closeConversation(conversationId: string) {
  const deleteAt = new Date();
  deleteAt.setDate(deleteAt.getDate() + 7); // 7 天后删除

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      deleteAt
    }
  });
}

// 定时任务：每天清理过期对话
@Cron('0 2 * * *') // 每天 02:00
async cleanupOldConversations() {
  const result = await prisma.chatConversation.deleteMany({
    where: {
      deleteAt: { lte: new Date() }
    }
  });

  this.logger.log(`清理了 ${result.count} 个过期对话`);
}
```

#### 优点
- ✅ 数据库体积最小
- ✅ 查询性能最佳
- ✅ 维护简单

#### 缺点
- ❌ 无法查询历史记录
- ❌ 不满足审计要求
- ❌ 问题追溯困难

---

### 方案 4：混合策略（灵活性最高）

#### 特点
- 重要对话永久保留
- 普通对话定期清理
- 支持用户自主选择

#### 数据结构
```prisma
model ChatConversation {
  id             String              @id @default(uuid())
  userId         String
  adminId        String?
  status         ConversationStatus  @default(PENDING)
  retentionType  RetentionType       @default(STANDARD) // 保留类型
  closedAt       DateTime?
  messages       ChatMessage[]

  @@index([status, retentionType])
}

enum RetentionType {
  STANDARD   // 标准（7天后删除）
  EXTENDED   // 延长（30天后归档）
  PERMANENT  // 永久保留
}
```

#### 策略配置
```typescript
// 根据对话类型设置保留策略
async setRetentionPolicy(conversationId: string) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: { messages: true }
  });

  let retentionType: RetentionType;

  // 规则 1：包含投诉关键词 → 永久保留
  const hasComplaint = conversation.messages.some(m =>
    /投诉|举报|不满/.test(m.content)
  );

  // 规则 2：消息数超过 50 条 → 延长保留
  const isLongConversation = conversation.messages.length > 50;

  if (hasComplaint) {
    retentionType = 'PERMANENT';
  } else if (isLongConversation) {
    retentionType = 'EXTENDED';
  } else {
    retentionType = 'STANDARD';
  }

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { retentionType }
  });
}
```

#### 优点
- ✅ 灵活性高，可按需调整
- ✅ 重要对话不丢失
- ✅ 控制数据库增长

#### 缺点
- ⚠️ 实现复杂度高
- ⚠️ 需要明确的保留规则

---

## 推荐方案

### 针对您的业务场景

根据"显示处理中和待处理的消息"的需求，我推荐：

### 🎯 方案 2：定期归档（最佳平衡）

#### 理由
1. **满足业务需求**
   - 待处理（PENDING）和处理中（ACTIVE）的对话始终在主表，查询快速
   - 关闭（CLOSED）的对话保留 7-30 天后归档，用户仍可查询近期历史

2. **性能优化**
   - 主表数据量小（只包含活跃对话）
   - 查询速度快，无需复杂的分页逻辑

3. **合规性**
   - 保留完整历史记录，满足审计要求
   - 归档数据可随时恢复

4. **成本可控**
   - 主表增长缓慢
   - 归档表可使用更便宜的存储方案

#### 实施建议

```typescript
// 对话状态流转
PENDING（待处理）
   ↓
ACTIVE（处理中）
   ↓
CLOSED（已关闭）→ 保留 7-30 天
   ↓
ARCHIVED（已归档）→ 移至归档表
```

#### 配置参数
```typescript
// 可通过环境变量配置
CHAT_ARCHIVE_DAYS=30        // 关闭后多少天归档
CHAT_ARCHIVE_ENABLED=true   // 是否启用归档
CHAT_DELETE_ARCHIVED=false  // 是否删除归档数据（false=永久保留）
```

---

## 实现示例

### 简化的 Schema（推荐方案 2）

```prisma
model ChatConversation {
  id               String              @id @default(uuid())
  userId           String
  userName         String?
  adminId          String?
  adminName        String?
  status           ConversationStatus  @default(PENDING)
  unreadUserCount  Int                 @default(0)
  unreadAdminCount Int                 @default(0)
  lastMessageAt    DateTime?
  lastMessage      String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  closedAt         DateTime?

  user             User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages         ChatMessage[]

  @@index([userId])
  @@index([adminId])
  @@index([status, lastMessageAt])
}

model ChatMessage {
  id             String           @id @default(uuid())
  conversationId String
  senderId       String
  senderType     SenderType
  senderName     String?
  messageType    MessageType      @default(TEXT)
  content        String           @db.Text
  isRead         Boolean          @default(false)
  readAt         DateTime?
  createdAt      DateTime         @default(now())

  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}

enum ConversationStatus {
  PENDING   // 待处理
  ACTIVE    // 处理中
  CLOSED    // 已关闭
}

enum SenderType {
  USER
  ADMIN
  SYSTEM
}

enum MessageType {
  TEXT
  IMAGE
  SYSTEM
}
```

### 核心查询方法

```typescript
// 管理员后台：获取需要处理的对话列表
async getAdminConversations(adminId?: string) {
  return await prisma.chatConversation.findMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      ...(adminId && { adminId }) // 可选：只看自己负责的
    },
    orderBy: [
      { status: 'asc' },        // PENDING 优先
      { lastMessageAt: 'desc' } // 最新消息在前
    ],
    include: {
      user: {
        select: { id: true, displayName: true, email: true }
      }
    }
  });
}

// 用户端：获取自己的对话
async getUserConversation(userId: string) {
  // 查找或创建对话
  let conversation = await prisma.chatConversation.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'ACTIVE'] }
    },
    include: { messages: true }
  });

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        userId,
        status: 'PENDING'
      },
      include: { messages: true }
    });
  }

  return conversation;
}
```

---

## 结论

**推荐使用方案 2（定期归档）**，因为它：
- ✅ 满足"显示处理中和待处理"的核心需求
- ✅ 保留历史记录，满足审计和追溯
- ✅ 性能优秀，查询速度快
- ✅ 成本可控，数据库增长缓慢

如果您确定**完全不需要历史记录**，可以选择方案 3（自动清理），实现更简单。

您倾向于哪个方案？我可以根据您的选择调整实施计划。


