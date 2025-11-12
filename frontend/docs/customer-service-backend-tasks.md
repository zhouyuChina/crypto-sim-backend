# 客服模組後端串接需求清單

本文件整理前端客服管理頁面所需的 API 功能，供後端評估與實作參考。所有 API 範例皆以 `/admin/support` 作為命名空間，實際路徑可依後端規範調整。

## 1. 取得對話列表
- **目的**：載入左側「用戶對話」列表，顯示有訊息記錄的用戶與其最新狀態。
- **建議端點**：`GET /admin/support/conversations`
- **回傳資料**（陣列）：
  - `id`：對話識別碼
  - `userId`：用戶 ID
  - `userName`：顯示名稱
  - `lastMessageAt`：最後訊息時間（ISO 字串）
  - `unreadCount`：未讀訊息數
  - `status`：`PENDING`｜`IN_PROGRESS`｜`RESOLVED`
- **需求**：
  - 按 `lastMessageAt` 由新到舊排序。
  - 回傳的 `status` 需與後端儲存一致，未設定時預設為 `PENDING`。

## 2. 取得單一對話訊息
- **目的**：載入右側訊息區塊，顯示完整對話內容。
- **建議端點**：`GET /admin/support/conversations/:conversationId`
- **回傳資料**：
  - 同列表欄位，外加 `messages` 陣列，每筆包含：
    - `id`
    - `sender`：`USER` 或 `ADMIN`
    - `content`
    - `createdAt`
    - `read`
- **需求**：
  - 訊息需依時間由舊到新排序。
  - 回傳資料中需包含最新 `status`。

## 3. 更新對話狀態
- **目的**：前端切換「待處理／處理中／處理完畢」時同步後端。
- **建議端點**：`PATCH /admin/support/conversations/:conversationId/status`
- **請求內容**：
  ```json
  { "status": "IN_PROGRESS" }
  ```
- **回傳**：更新後的完整對話或狀態欄位。

## 4. 傳送客服訊息
- **目的**：管理員於前端回覆用戶訊息。
- **建議端點**：`POST /admin/support/conversations/:conversationId/messages`
- **請求內容**：
  ```json
  { "content": "您好，您的問題已處理完成。" }
  ```
- **回傳**：新訊息內容（含 `id`、`createdAt` 等）。
- **需求**：
  - 後端應標註訊息為管理員所發 (`sender = ADMIN`)。
  - 回傳後端儲存的最新 `status`、`lastMessageAt` 必要時一併提供。

## 5. 標記訊息為已讀（可選）
- **目的**：前端切換對話時，將使用者訊息標記為已讀並更新未讀數。
- **建議端點**：`POST /admin/support/conversations/:conversationId/read`
- **請求內容**：可為空物件。
- **回傳**：最新未讀數或更新結果。

## 6. 清除（或刪除）對話紀錄
- **目的**：前端「清除所有對話」按鈕，刪除客服歷史訊息。
- **建議端點**：依需求討論：
  - 全部清除：`DELETE /admin/support/conversations`
  - 指定對話：`DELETE /admin/support/conversations/:conversationId`
- **回傳**：操作成功與否；必要時回傳剩餘對話列表。

## 7. 權限與驗證
- 所有端點需套用管理員驗證與權限檢查。
- 建議記錄操作日誌（誰在何時回覆／刪除對話），以便稽核。

## 8. 前端暫存與假資料提醒
- 目前前端為了示範與測試，使用記憶體中的假資料（mock conversations/messages），並透過 `supportService` 模擬 API 回應與延遲。
- 請後端 API 完成後，協助移除以下暫存實作，改為串接真實資料來源：
  - `frontend/src/services/support.ts` 內 `createMockConversations`、`conversationsStore`、`localConversationsStore` 及相關模擬函式。
  - `frontend/src/routes/customer-service.tsx` 對應的暫存資料使用邏輯（`localMessages` 仍可保留為送出訊息的樂觀更新，但應以後端回傳資料為主）。
- 服務端需提供實際資料後，前端會移除上述 mock 並改為呼叫真實 API。

## 9. 其他建議
- 若未來需支援附件（圖片／影片），可在訊息物件中加入 `attachmentUrl`、`attachmentType` 等欄位。
- 建議提供分頁或滾動載入參數，以避免對話與訊息量過大時造成效能問題。

如需更多欄位或流程細節，可與前端成員討論後補充。***

