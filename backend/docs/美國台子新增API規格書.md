# API 規格總覽（依功能 × API 對象重整）

> 文件用途：讓工程師能依「功能」與「API 使用對象（客戶端 / 後台）」快速定位。  
> 範圍：  
> 1) 出入金（充值/提領、記錄、審核與餘額變更）  
> 2) CMS 公開文案（反詐騙與風險提示）  
> 3) CRM 新增用戶  

---

## A. 通用規格

### A1. 列舉

| 名稱 | 值 |
|---|---|
| `FundingType` | `deposit` \| `withdraw` |
| `FundingStatus` | `pending` \| `completed` \| `failed` |
| `Network` | `TRC20`（目前固定） |

### A2. 認證

| API 對象 | 驗證 |
|---|---|
| 客戶端 API | `Authorization: Bearer <accessToken>` |
| 後台 API | `Authorization: Bearer <adminToken>`（需角色權限） |

### A3. 基本原則

1. 時間欄位使用 ISO 8601。  
2. 金額欄位 `amount` 為 number，提領允許小數。  
3. 狀態流固定三態：`pending -> completed` 或 `pending -> failed`。  
4. 審核核准時若 `applyBalance=true`，由後端同步變更使用者 `REAL` 餘額。  

---

## B. 出入金功能（核心）

## B1. 客戶端 API（Web / App）

### B1-1. 充值地址設定（既有）

- `GET {API_BASE}/settings/deposit/address`

回應（扁平或 `data` 包裹皆可，但建議固定一種）：

```json
{
  "address": "Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "qrCodeUrl": "https://..."
}
```

### B1-2. 建立充值申請

- `POST {API_BASE}/deposit-withdraw/deposit`

Request:

```json
{
  "amount": 100.5,
  "network": "TRC20",
  "txHash": "0x_or_tron_txid_string",
  "remark": "選填"
}
```

### B1-3. 建立提領申請

- `POST {API_BASE}/deposit-withdraw/withdraw`

Request:

```json
{
  "amount": 50.25,
  "network": "TRC20",
  "toAddress": "Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "remark": "選填"
}
```

驗證重點：
- `amount >= 10`、且提領不得超過可提餘額
- `toAddress` 符合 TRC20 地址格式

### B1-4. 充提記錄列表

- `GET {API_BASE}/deposit-withdraw`
- Query: `page`, `limit`, `type`, `status`

篩選狀態僅：
- `pending`
- `completed`
- `failed`

回應範例（必要欄位）：

```json
{
  "data": [
    {
      "id": "dep-xxxx",
      "type": "deposit",
      "amount": 100.5,
      "status": "pending",
      "date": "2026-04-10T08:00:00.000Z",
      "method": "TRC20 · TXID: ...",
      "txHash": "...",
      "toAddress": null,
      "remark": "user remark",
      "reviewNote": "審核備註（可空）"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

> 前台顯示規則：  
> - 狀態以 `status` 呈現（待審核 / 已完成 / 駁回）  
> - 僅 `failed` 時顯示 `reviewNote`（駁回原因）  

### B1-5. 客戶端常見錯誤碼

| HTTP | code | 說明 |
|---|---|---|
| 400 | `INVALID_AMOUNT` | 金額錯誤 |
| 400 | `TX_HASH_REQUIRED` / `INVALID_TX_HASH` | 充值 TXID 錯誤 |
| 400 | `INVALID_ADDRESS` | 提領地址錯誤 |
| 401 | `UNAUTHORIZED` | Token 失效 |
| 403 | `KYC_REQUIRED` | 提領需完成 KYC |
| 409 | `DUPLICATE_TX_HASH` | 重複 TXID |
| 409 | `INSUFFICIENT_BALANCE` | 提領餘額不足 |

---

## B2. 後台 API（CRM / 管理端）

> 對應 `Zenvy_crm_frontend`「出入金作業」頁：待審核、歷史、單筆/批次審核。

### B2-1. 管理端記錄列表

- `GET {API_BASE}/admin/funding/records`
- Query: `page`, `limit`, `type`, `status`, `userId`, `username`, `from`, `to`

範例：

```json
{
  "data": {
    "data": [
      {
        "id": "dep-xxxx",
        "type": "deposit",
        "userId": "user-123",
        "userName": "alice",
        "amount": 100.5,
        "status": "pending",
        "date": "2026-04-10T08:00:00.000Z",
        "network": "TRC20",
        "txHash": "abcd...",
        "toAddress": null,
        "method": "TRC20 · TXID: abcd...",
        "remark": "manual submit",
        "reviewNote": null,
        "reviewedAt": null,
        "reviewedBy": null,
        "balanceApplied": false,
        "beforeRealBalance": null,
        "afterRealBalance": null
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

### B2-2. 審核動作（核准/駁回）

- `POST {API_BASE}/admin/funding/records/{id}/review`

Request:

```json
{
  "action": "approve",
  "reviewNote": "鏈上確認完成",
  "applyBalance": true
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `action` | `approve` \| `reject` | 是 | 審核結果 |
| `reviewNote` | string | 否 | 審核備註（駁回建議必填） |
| `applyBalance` | boolean | 否 | 核准時是否套用餘額，建議預設 `true` |

Response:

```json
{
  "data": {
    "record": {
      "id": "dep-xxxx",
      "status": "completed",
      "reviewedAt": "2026-04-10T09:00:00.000Z",
      "reviewedBy": "admin-1",
      "reviewNote": "鏈上確認完成",
      "balanceApplied": true,
      "beforeRealBalance": 50,
      "afterRealBalance": 150.5
    }
  }
}
```

### B2-3. 核准時餘額變更規則（必實作）

1. `action=approve` 且 `applyBalance=true`：
   - `deposit`：`REAL += amount`
   - `withdraw`：`REAL -= amount`
2. `action=reject`：不得變更餘額。
3. 必須防重複套用（冪等/鎖）。
4. 建議單一 DB transaction：
   - 更新 funding 狀態
   - 寫審核軌跡
   - 寫餘額變更 ledger

### B2-4. 管理端錯誤碼

| HTTP | code | 說明 |
|---|---|---|
| 400 | `INVALID_REVIEW_ACTION` | 動作非法 |
| 400 | `BALANCE_NOT_APPLICABLE` | `reject` 卻帶 `applyBalance=true` |
| 401 | `UNAUTHORIZED` | 未登入 |
| 403 | `FORBIDDEN` | 無審核權限 |
| 404 | `FUNDING_RECORD_NOT_FOUND` | 記錄不存在 |
| 409 | `FUNDING_ALREADY_REVIEWED` | 已審核不可重覆 |
| 409 | `INSUFFICIENT_REAL_BALANCE` | 核准提領時餘額不足 |
| 422 | `VALIDATION_ERROR` | 欄位驗證失敗 |

---

## C. CMS 文案功能（反詐騙 + 風險提示）

> 前台目前 fallback：`src/config/cmsPublicLegalCopy.ts`

## C1. 客戶端 API（公開讀取）

- `GET {API_BASE}/cms/public-legal?locale=zh-TW`

Response:

```json
{
  "locale": "zh-TW",
  "homeAntiScam": {
    "title": "反詐騙宣導",
    "tip1": "本平台<strong>絕不會</strong>…",
    "tip2": "…",
    "tip3": "…",
    "tip4": "…",
    "suggestion": "…"
  },
  "tutorialSectionE": {
    "title": "風險提示",
    "content": "• 第一點…\n• 第二點…"
  },
  "updatedAt": "2026-04-10T12:00:00.000Z"
}
```

## C2. 後台 API（CMS CRUD）

基底：`/admin/cms/public-legal`

| Method | URL | 用途 |
|---|---|---|
| `GET` | `/admin/cms/public-legal` | 語系列表 |
| `GET` | `/admin/cms/public-legal/{locale}` | 單語系內容 |
| `PUT` | `/admin/cms/public-legal/{locale}` | Upsert 整包 |
| `PATCH` | `/admin/cms/public-legal/{locale}` | 局部更新（可選） |
| `DELETE` | `/admin/cms/public-legal/{locale}` | 刪除（可選） |
| `POST` | `/admin/cms/public-legal/{locale}/publish` | 發佈（可選） |

欄位與校驗：
- `locale`: `zh-TW|zh-CN|en|es|pt|ru`
- `homeAntiScam.tip1~tip4/suggestion` 允許 `<strong>` 白名單 HTML
- `tutorialSectionE.content` 以文字 + `\n` 換行為主

錯誤碼：
- `INVALID_LOCALE`
- `PUBLIC_LEGAL_NOT_FOUND`
- `VALIDATION_ERROR`
- `VERSION_CONFLICT`（ETag/version）

---

## D. CRM 新增用戶功能

## D1. 後台 API

- `POST {API_BASE}/admin/users`
- 支援 `application/json` / `multipart/form-data`

必要欄位：
- `email`, `password`, `displayName`, `phoneNumber`
- `demoBalance`, `realBalance`
- `verificationStatus`

選填：
- `idCardFront`, `idCardBack`

Request(JSON):

```json
{
  "email": "player001@example.com",
  "password": "123456",
  "displayName": "Player 001",
  "phoneNumber": "+1-202-555-0100",
  "demoBalance": 10000,
  "realBalance": 0,
  "verificationStatus": "PENDING"
}
```

Response（建議）：
- 外層 `data` 包裹完整 User DTO

常見錯誤碼：
- `VALIDATION_ERROR`
- `INVALID_VERIFICATION_STATUS`
- `INVALID_ID_CARD_FILE`
- `EMAIL_ALREADY_EXISTS`
- `FILE_TOO_LARGE`

---

## E. 前後端對接清單（實作優先序）

1. 客戶端出入金申請（B1-2, B1-3）  
2. 客戶端充提記錄（B1-4，含 `reviewNote` 與三態 `status`）  
3. 管理端審核（B2-1, B2-2）  
4. 核准即餘額變更（B2-3）  
5. CMS 公開讀取 + 後台 CRUD（C1, C2）  
6. CRM 新增用戶 API（D1）

---

## F. 版本紀錄

| 版本 | 日期 | 說明 |
|---|---|---|
| 1.0 | 2026-04-10 | 初版：出入金表單與記錄 |
| 1.1 | 2026-04-10 | 加入 CMS 規劃 |
| 1.2 | 2026-04-10 | CMS CRUD/校驗/併發控制 |
| 1.3 | 2026-04-10 | CRM 出入金審核與餘額變更 |
| 1.4 | 2026-04-10 | CRM 新增用戶 API |
| 1.5 | 2026-04-10 | 本次重排：按功能 × 客戶端API/後台API 整理 |

