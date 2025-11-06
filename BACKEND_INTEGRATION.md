# 後端聯調需求文檔

本文檔記錄前端需要與後端聯調的 API 端點和功能。

## 📋 目錄

- [管理員管理](#管理員管理)
- [IP白名單管理](#ip白名單管理)
- [操作員管理](#操作員管理)
- [用戶管理](#用戶管理)
- [交易流水](#交易流水)
- [其他功能](#其他功能)

---

## 🔐 管理員管理

### 1. 獲取管理員列表

**請求**
```
GET /admin/admins
```

**查詢參數**
```typescript
{
  page?: number;           // 頁碼，默認 1
  pageSize?: number;       // 每頁數量，默認 10
  search?: string;         // 搜索關鍵字（用戶名或顯示名稱）
  sortBy?: string;         // 排序欄位：'createdAt' | 'updatedAt' | 'username' | 'displayName' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'; // 排序方向
  isActive?: boolean;      // 篩選狀態（可選）
}
```

**響應**
```typescript
{
  data: {
    data: Admin[];         // 管理員列表
    total: number;         // 總數
    page: number;          // 當前頁碼
    pageSize: number;      // 每頁數量
    totalPages: number;    // 總頁數
  }
}
```

**Admin 類型**
```typescript
{
  id: string;
  username: string;
  displayName?: string;
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### 2. 獲取單個管理員詳情

**請求**
```
GET /admin/admins/:id
```

**響應**
```typescript
{
  data: Admin;
}
```

---

### 3. 創建管理員

**請求**
```
POST /admin/admins
```

**請求體**
```typescript
{
  username: string;        // 必填，用戶名
  password: string;         // 必填，密碼
  displayName?: string;    // 可選，顯示名稱
}
```

**響應**
```typescript
{
  data: Admin;
}
```

---

### 4. 更新管理員

**請求**
```
PUT /admin/admins/:id
```

**請求體**
```typescript
{
  username?: string;       // 可選，用戶名
  password?: string;        // 可選，密碼（留空則不修改）
  displayName?: string;    // 可選，顯示名稱
  isActive?: boolean;       // 可選，啟用狀態
}
```

**響應**
```typescript
{
  data: Admin;
}
```

**注意事項**
- 如果 `password` 為空字符串或未提供，則不更新密碼
- 只有提供了 `password` 時才更新密碼

---

### 5. 刪除管理員

**請求**
```
DELETE /admin/admins/:id
```

**響應**
```typescript
{
  message?: string;        // 可選，成功消息
}
```

**狀態碼**
- `200` 或 `204`: 刪除成功
- `404`: 管理員不存在
- `403`: 無權限刪除（例如：不能刪除當前登入的管理員）

---

## 🔒 IP白名單管理

### 功能說明

IP白名單功能用於限制管理後台的登入訪問。啟用後，只有白名單中的IP地址才能登入管理後台，即使帳號密碼正確，如果IP不在白名單中，也無法登入。

### 1. 獲取IP白名單功能設置

**請求**
```
GET /admin/settings/ip-whitelist/config
```

**響應**
```typescript
{
  data: {
    enabled: boolean;  // 是否啟用IP白名單功能
  }
}
```

---

### 2. 更新IP白名單功能設置

**請求**
```
PUT /admin/settings/ip-whitelist/config
```

**請求體**
```typescript
{
  config: {
    enabled: boolean;  // 是否啟用IP白名單功能
  }
}
```

**響應**
```typescript
{
  message?: string;  // 可選，成功消息
}
```

---

### 3. 獲取IP白名單列表

**請求**
```
GET /admin/settings/ip-whitelist
```

**查詢參數**
```typescript
{
  page?: number;           // 頁碼，默認 1
  pageSize?: number;       // 每頁數量，默認 10
  search?: string;          // 搜索關鍵字（IP地址或描述）
  isActive?: boolean;       // 篩選狀態（可選）
}
```

**響應**
```typescript
{
  data: {
    data: IpWhitelist[];   // IP白名單列表
    total: number;         // 總數
    page: number;          // 當前頁碼
    pageSize: number;      // 每頁數量
    totalPages: number;    // 總頁數
  }
}
```

**IpWhitelist 類型**
```typescript
{
  id: string;
  ipAddress: string;       // IP地址或CIDR格式（如：192.168.1.1 或 192.168.1.0/24）
  description?: string;    // 描述/備註
  isActive: boolean;       // 是否啟用
  createdAt: string;
  updatedAt: string;
}
```

---

### 4. 獲取單個IP白名單詳情

**請求**
```
GET /admin/settings/ip-whitelist/:id
```

**響應**
```typescript
{
  data: IpWhitelist;
}
```

---

### 5. 創建IP白名單

**請求**
```
POST /admin/settings/ip-whitelist
```

**請求體**
```typescript
{
  ipAddress: string;       // 必填，IP地址或CIDR格式
  description?: string;    // 可選，描述/備註
  isActive?: boolean;       // 可選，是否啟用，默認 true
}
```

**響應**
```typescript
{
  data: IpWhitelist;
}
```

**IP地址格式要求**
- 支持單個IPv4地址：`192.168.1.1`
- 支持CIDR格式：`192.168.1.0/24`
- 需要驗證格式有效性

---

### 6. 更新IP白名單

**請求**
```
PUT /admin/settings/ip-whitelist/:id
```

**請求體**
```typescript
{
  ipAddress?: string;      // 可選，IP地址或CIDR格式
  description?: string;    // 可選，描述/備註
  isActive?: boolean;       // 可選，是否啟用
}
```

**響應**
```typescript
{
  data: IpWhitelist;
}
```

---

### 7. 刪除IP白名單

**請求**
```
DELETE /admin/settings/ip-whitelist/:id
```

**響應**
```typescript
{
  message?: string;  // 可選，成功消息
}
```

**狀態碼**
- `200` 或 `204`: 刪除成功
- `404`: IP白名單不存在
- `403`: 無權限刪除

---

### 登入驗證邏輯

當IP白名單功能啟用時，登入驗證流程應為：

1. 驗證帳號密碼
2. 如果帳號密碼正確，檢查IP白名單功能是否啟用
3. 如果IP白名單功能已啟用，檢查請求IP是否在白名單中
4. 檢查時應考慮：
   - 只檢查 `isActive: true` 的記錄
   - 支持CIDR格式匹配（如：`192.168.1.0/24` 應匹配 `192.168.1.1` 到 `192.168.1.254`）
   - 如果IP不在白名單中，返回 `403 Forbidden` 或適當的錯誤消息

**登入API變更**
現有的登入端點 `POST /admin/auth/login` 應增加IP白名單檢查邏輯。

---

## 👨‍💼 操作員管理

### 功能說明

操作員管理用於管理系統中的操作員帳號，包括操作員的基本資訊、帳戶餘額、交易流水等。操作員的交易流水會自動計算總交易筆數和總收益。

### 1. 獲取操作員列表

**請求**
```
GET /admin/operators
```

**查詢參數**
```typescript
{
  page?: number;           // 頁碼，默認 1
  pageSize?: number;       // 每頁數量，默認 10
  search?: string;         // 搜索關鍵字（姓名、郵箱或電話）
  sortBy?: string;         // 排序欄位：'createdAt' | 'updatedAt' | 'name' | 'email' | 'totalTransactions' | 'totalProfit'
  sortOrder?: 'asc' | 'desc'; // 排序方向
  status?: 'active' | 'inactive'; // 篩選狀態（可選）
}
```

**響應**
```typescript
{
  data: {
    data: Operator[];      // 操作員列表
    total: number;         // 總數
    page: number;          // 當前頁碼
    pageSize: number;      // 每頁數量
    totalPages: number;    // 總頁數
  }
}
```

**Operator 類型**
```typescript
{
  id: string;
  name: string;            // 姓名
  email: string;           // 郵箱
  phone?: string;          // 電話（可選）
  status: 'active' | 'inactive'; // 狀態
  totalTransactions: number; // 總交易筆數（自動計算）
  totalProfit: number;     // 總收益（自動計算，根據交易流水）
  demoAccountBalance: number; // 虛擬帳戶餘額
  realAccountBalance: number; // 真實帳戶餘額
  createdAt: string;
  updatedAt: string;
}
```

---

### 2. 獲取單個操作員詳情

**請求**
```
GET /admin/operators/:id
```

**響應**
```typescript
{
  data: Operator;
}
```

---

### 3. 更新操作員資訊

**請求**
```
PUT /admin/operators/:id
```

**請求體**
```typescript
{
  name?: string;           // 可選，姓名
  email?: string;          // 可選，郵箱
  phone?: string;          // 可選，電話
  status?: 'active' | 'inactive'; // 可選，狀態
  demoAccountBalance?: number; // 可選，虛擬帳戶餘額
  realAccountBalance?: number; // 可選，真實帳戶餘額
}
```

**響應**
```typescript
{
  data: Operator;
}
```

**注意事項**
- `totalTransactions` 和 `totalProfit` 由系統根據交易流水自動計算，不應在更新時手動設置
- 郵箱格式需要驗證
- 餘額應為非負數

---

### 4. 獲取操作員交易流水

**請求**
```
GET /admin/operators/:id/transactions
```

**查詢參數**
```typescript
{
  page?: number;           // 頁碼，默認 1
  pageSize?: number;       // 每頁數量，默認 10（移動端使用無限滾動時，每次加載 30 筆）
  search?: string;         // 搜索關鍵字（訂單號）
  sortBy?: string;         // 排序欄位
  sortOrder?: 'asc' | 'desc'; // 排序方向
  assetType?: string;      // 篩選交易對（39個固定選項）
  direction?: 'CALL' | 'PUT'; // 篩選方向
  accountType?: 'DEMO' | 'REAL'; // 篩選帳戶類型
  status?: 'PENDING' | 'SETTLED'; // 篩選狀態
  startDate?: string;      // 開始日期（ISO 8601）
  endDate?: string;        // 結束日期（ISO 8601）
}
```

**響應**
```typescript
{
  data: {
    data: OperatorTransaction[]; // 交易列表
    total: number;         // 總數
    page: number;          // 當前頁碼
    pageSize: number;      // 每頁數量
    totalPages: number;    // 總頁數
  }
}
```

**OperatorTransaction 類型**
```typescript
{
  id: string;
  operatorId: string;      // 操作員ID
  operatorName: string;    // 操作員姓名
  userId: string;          // 用戶ID（統一為 operator-{operatorId}）
  userName: string;        // 用戶名（統一為操作員姓名）
  orderNumber: string;     // 訂單號
  accountType: 'DEMO' | 'REAL'; // 帳戶類型
  assetType: string;       // 交易對（39個固定選項之一）
  direction: 'CALL' | 'PUT'; // 方向
  entryTime: string;       // 入場時間（ISO 8601）
  expiryTime: string;      // 出場時間（ISO 8601，計算：入場時間 + 交易秒數）
  duration: number;        // 交易秒數（固定值：30/60/90/120/150/180）
  entryPrice: number;      // 入場價
  currentPrice: number | null; // 當前價格
  exitPrice: number | null; // 出場價
  spread: number;          // 點差
  investAmount: number;    // 投資金額（整數）
  returnRate: number;      // 盈利率（根據交易秒數自動計算：duration / 30 * 5）
  actualReturn: number;    // 實際收益
  status: 'PENDING' | 'SETTLED'; // 狀態（不包含 CANCELED）
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  isManaged: boolean;
}
```

**交易秒數與盈利率對應關係**
- 30秒 = 5%
- 60秒 = 10%
- 90秒 = 15%
- 120秒 = 20%
- 150秒 = 25%
- 180秒 = 30%

**交易對選項（39個）**
```
BTC/USDT, ETH/USDT, USDC/USDT, SOL/USDT, XRP/USDT, BNB/USDT,
DOGE/USDT, ADA/USDT, LINK/USDT, BNB/USD, BNB/EUR, BNB/TRY,
BNB/BRL, BNB/AUD, BTC/USD, BTC/EUR, BTC/TRY, BTC/BRL,
BTC/AUD, ETH/USD, ETH/EUR, ETH/TRY, ETH/BRL, ETH/AUD,
SOL/USD, SOL/EUR, XRP/USD, XRP/EUR, ADA/USD, ADA/EUR,
DOGE/USD, DOGE/EUR, LINK/USD, LINK/EUR, BNB/BTC, BNB/ETH,
BNB/ADA, BNB/BUSD, BNB/USDC
```

---

### 5. 創建操作員交易流水

**請求**
```
POST /admin/operators/:id/transactions
```

**請求體**
```typescript
{
  assetType: string;       // 必填，交易對（39個固定選項之一）
  direction: 'CALL' | 'PUT'; // 必填，方向
  accountType: 'DEMO' | 'REAL'; // 必填，帳戶類型
  entryPrice: number;      // 必填，入場價
  exitPrice?: number;      // 可選，出場價
  investAmount: number;    // 必填，投資金額（整數）
  duration: number;        // 必填，交易秒數（固定值：30/60/90/120/150/180）
  entryTime: string;       // 必填，入場時間（ISO 8601）
  status: 'PENDING' | 'SETTLED'; // 必填，狀態
}
```

**響應**
```typescript
{
  data: OperatorTransaction;
}
```

**注意事項**
- `expiryTime`（出場時間）應自動計算：`entryTime + duration * 1000`（毫秒）
- `returnRate`（盈利率）應自動計算：`(duration / 30) * 5`
- `actualReturn`（實際收益）應根據交易結果計算
- `orderNumber` 應自動生成唯一訂單號
- `userId` 和 `userName` 應自動設置為操作員的ID和姓名

---

### 6. 更新操作員交易流水

**請求**
```
PUT /admin/operators/:id/transactions/:transactionId
```

**請求體**
```typescript
{
  assetType?: string;      // 可選，交易對
  direction?: 'CALL' | 'PUT'; // 可選，方向
  accountType?: 'DEMO' | 'REAL'; // 可選，帳戶類型
  entryPrice?: number;     // 可選，入場價
  exitPrice?: number;      // 可選，出場價
  investAmount?: number;   // 可選，投資金額（整數）
  duration?: number;       // 可選，交易秒數（固定值：30/60/90/120/150/180）
  entryTime?: string;      // 可選，入場時間（ISO 8601）
  status?: 'PENDING' | 'SETTLED'; // 可選，狀態
}
```

**響應**
```typescript
{
  data: OperatorTransaction;
}
```

**注意事項**
- 如果更新了 `entryTime` 或 `duration`，應自動重新計算 `expiryTime`
- 如果更新了 `duration`，應自動重新計算 `returnRate`
- 如果更新了 `exitPrice`，可能需要重新計算 `actualReturn`

---

### 7. 刪除操作員交易流水

**請求**
```
DELETE /admin/operators/:id/transactions/:transactionId
```

**響應**
```typescript
{
  message?: string;        // 可選，成功消息
}
```

**狀態碼**
- `200` 或 `204`: 刪除成功
- `404`: 交易不存在
- `403`: 無權限刪除

---

## 👥 用戶管理

### 現有端點（已實現）

以下端點前端已實現，請確認後端是否支援：

- `GET /admin/users` - 獲取用戶列表
- `GET /admin/users/:id` - 獲取用戶詳情
- `PUT /admin/users/:id` - 更新用戶信息
- `PATCH /admin/users/:id/activate` - 激活用戶
- `PATCH /admin/users/:id/deactivate` - 停用用戶
- `PATCH /admin/users/:id/roles` - 修改用戶角色
- `PATCH /admin/users/:id/balance` - 調整用戶餘額
- `DELETE /admin/users/:id` - 刪除用戶

---

## 💰 交易流水

### 現有端點（已實現）

以下端點前端已實現，請確認後端是否支援：

- `GET /admin/transactions` - 獲取交易列表
- `PATCH /admin/transactions/:id/settle` - 結算交易
- `DELETE /admin/transactions/:id` - 取消交易

---

## ⚙️ 系統設置

### 現有端點（已實現）

以下端點前端已實現，請確認後端是否支援：

- `PUT /admin/settings/admin-account` - 更新管理員帳號（舊版，已棄用，改為使用管理員管理 API）
- `GET /admin/settings/trading/channels` - 獲取交易渠道設置
- `PUT /admin/settings/trading/channels` - 更新交易渠道設置
- `GET /admin/settings/trading/managed-mode` - 獲取託管模式設置
- `PUT /admin/settings/trading/managed-mode` - 更新託管模式設置
- `GET /admin/settings/customer-service` - 獲取客服窗口設置
- `PUT /admin/settings/customer-service` - 更新客服窗口設置
- `GET /admin/settings/latency` - 獲取延遲設置
- `PUT /admin/settings/latency` - 更新延遲設置

---

## 📝 聯調檢查清單

### 管理員管理

- [ ] `GET /admin/admins` - 列表查詢（分頁、搜索、排序）
- [ ] `GET /admin/admins/:id` - 獲取詳情
- [ ] `POST /admin/admins` - 創建管理員
- [ ] `PUT /admin/admins/:id` - 更新管理員
- [ ] `DELETE /admin/admins/:id` - 刪除管理員
- [ ] 權限驗證（只有管理員可以訪問）
- [ ] 防止刪除當前登入的管理員
- [ ] 密碼驗證（強度要求、長度等）

### IP白名單管理

- [ ] `GET /admin/settings/ip-whitelist/config` - 獲取功能設置
- [ ] `PUT /admin/settings/ip-whitelist/config` - 更新功能設置
- [ ] `GET /admin/settings/ip-whitelist` - 列表查詢（分頁、搜索）
- [ ] `GET /admin/settings/ip-whitelist/:id` - 獲取詳情
- [ ] `POST /admin/settings/ip-whitelist` - 創建IP白名單
- [ ] `PUT /admin/settings/ip-whitelist/:id` - 更新IP白名單
- [ ] `DELETE /admin/settings/ip-whitelist/:id` - 刪除IP白名單
- [ ] IP地址格式驗證（IPv4、CIDR格式）
- [ ] CIDR格式匹配邏輯
- [ ] 登入時IP白名單檢查（當功能啟用時）
- [ ] 權限驗證（只有管理員可以訪問）

### 操作員管理

- [ ] `GET /admin/operators` - 列表查詢（分頁、搜索、排序）
- [ ] `GET /admin/operators/:id` - 獲取操作員詳情
- [ ] `PUT /admin/operators/:id` - 更新操作員資訊
- [ ] `GET /admin/operators/:id/transactions` - 獲取操作員交易流水（分頁、搜索、篩選、排序）
- [ ] `POST /admin/operators/:id/transactions` - 創建操作員交易流水
- [ ] `PUT /admin/operators/:id/transactions/:transactionId` - 更新操作員交易流水
- [ ] `DELETE /admin/operators/:id/transactions/:transactionId` - 刪除操作員交易流水
- [ ] 交易秒數驗證（只允許 30/60/90/120/150/180）
- [ ] 交易對驗證（只允許 39 個固定選項）
- [ ] 盈利率自動計算（根據交易秒數）
- [ ] 出場時間自動計算（入場時間 + 交易秒數）
- [ ] 總交易筆數和總收益自動計算（根據交易流水）
- [ ] 投資金額驗證（必須為整數）
- [ ] 權限驗證（只有管理員可以訪問）

### 錯誤處理

請確認後端返回的錯誤格式：

```typescript
{
  statusCode: number;
  message: string | string[];
  error?: string;
}
```

或者：

```typescript
{
  error: {
    code: string;
    message: string;
  }
}
```

---

## 🔒 安全考慮

1. **權限控制**
   - 所有管理員管理端點應需要管理員權限
   - 建議添加角色檢查（例如：只有超級管理員可以刪除其他管理員）

2. **密碼安全**
   - 創建/更新時應驗證密碼強度
   - 密碼應進行哈希存儲，不應在響應中返回

3. **防護措施**
   - 防止刪除最後一個管理員
   - 防止刪除當前登入的管理員
   - 防止用戶名重複

4. **IP白名單安全**
   - IP地址格式驗證（支持IPv4和CIDR格式）
   - CIDR格式的正確匹配邏輯
   - 防止IP地址重複
   - 啟用IP白名單時，確保至少有一個有效的IP在白名單中
   - 登入時的正確IP獲取（考慮代理、負載均衡等情況）
   - 建議記錄登入失敗的原因（帳號密碼錯誤 vs IP不在白名單）

5. **操作員管理安全**
   - 操作員交易流水應與操作員ID關聯，確保數據隔離
   - 交易秒數和交易對應嚴格驗證，防止無效數據
   - 總交易筆數和總收益應根據實際交易流水計算，不應允許手動修改
   - 投資金額應驗證為非負整數
   - 盈利率和出場時間應自動計算，防止數據不一致

---

## 📞 聯繫方式

如有問題或需要調整，請聯繫前端開發團隊。

---

**最後更新**: 2025-01-XX
**文檔版本**: 1.0.0

