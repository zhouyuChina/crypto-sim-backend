-- ========================================
-- 检查 settledAccountBalance 错误数据
-- ========================================

-- 1. 统计错误数据总数
-- ========================================
SELECT
  COUNT(*) AS "错误交易总数",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "总差额"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

-- 2. 查看错误数据详情（前 20 条）
-- ========================================
SELECT
  "orderNumber" AS "订单号",
  "userName" AS "用户名",
  ROUND("investAmount"::numeric, 2) AS "投资金额",
  ROUND("actualReturn"::numeric, 2) AS "实际收益",
  ROUND("entryAccountBalance"::numeric, 2) AS "开仓余额",
  ROUND("settledAccountBalance"::numeric, 2) AS "结算余额",
  ROUND(("settledAccountBalance" - "entryAccountBalance")::numeric, 2) AS "实际变化",
  ROUND((("settledAccountBalance" - "entryAccountBalance") - "actualReturn")::numeric, 2) AS "差额",
  "accountType" AS "账户类型",
  status AS "状态",
  "createdAt" AS "创建时间"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
ORDER BY "createdAt" DESC
LIMIT 20;

-- 3. 按账户类型统计
-- ========================================
SELECT
  "accountType" AS "账户类型",
  COUNT(*) AS "错误数量",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "差额总和"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
GROUP BY "accountType";

-- 4. 按用户统计受影响的用户
-- ========================================
SELECT
  "userId" AS "用户ID",
  "userName" AS "用户名",
  COUNT(*) AS "错误交易数",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "累计差额"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
GROUP BY "userId", "userName"
ORDER BY "错误交易数" DESC
LIMIT 10;

-- 5. 检查是否有 NULL 值的交易
-- ========================================
SELECT
  COUNT(*) AS "总交易数",
  COUNT(CASE WHEN "entryAccountBalance" IS NULL THEN 1 END) AS "缺少开仓余额",
  COUNT(CASE WHEN "settledAccountBalance" IS NULL AND status = 'SETTLED' THEN 1 END) AS "已结算但无结算余额"
FROM "TransactionLog";
