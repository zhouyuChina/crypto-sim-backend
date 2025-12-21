-- ========================================
-- 修复 settledAccountBalance 计算错误的交易流水
-- ========================================

-- 步骤 1: 检查有问题的数据
-- ========================================

-- 1.1 找出 settledAccountBalance 计算错误的交易
SELECT
  "orderNumber",
  "userName",
  "investAmount",
  "actualReturn",
  "entryAccountBalance",
  "settledAccountBalance",
  "settledAccountBalance" - "entryAccountBalance" AS "实际余额变化",
  "actualReturn" AS "预期余额变化",
  ("settledAccountBalance" - "entryAccountBalance") - "actualReturn" AS "差额",
  "accountType",
  status,
  "createdAt"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  -- 差额大于 0.01 的认为是错误数据
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
ORDER BY "createdAt" DESC;

-- 1.2 统计错误数据
SELECT
  COUNT(*) AS "错误交易总数",
  SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn")) AS "总差额"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;


-- 步骤 2: 备份错误数据（可选）
-- ========================================

-- 创建备份表
CREATE TABLE IF NOT EXISTS "TransactionLog_Backup_SettledBalance" AS
SELECT * FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

-- 查看备份数据
SELECT COUNT(*) FROM "TransactionLog_Backup_SettledBalance";


-- 步骤 3: 修复错误数据
-- ========================================

-- 方案 1: 直接修复（推荐）
-- 使用正确的公式重新计算 settledAccountBalance
BEGIN;

UPDATE "TransactionLog"
SET "settledAccountBalance" = "entryAccountBalance" + "actualReturn"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  -- 只更新计算错误的记录
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

-- 查看修复了多少条
-- 如果确认无误，执行 COMMIT；否则执行 ROLLBACK
COMMIT;
-- ROLLBACK;


-- 步骤 4: 验证修复结果
-- ========================================

-- 4.1 检查是否还有错误数据
SELECT
  COUNT(*) AS "剩余错误数据"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

-- 应该返回 0

-- 4.2 抽查修复后的数据
SELECT
  "orderNumber",
  "userName",
  "investAmount",
  "actualReturn",
  "entryAccountBalance",
  "settledAccountBalance",
  "settledAccountBalance" - "entryAccountBalance" AS "余额变化",
  CASE
    WHEN ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") < 0.01
    THEN '✅ 正确'
    ELSE '❌ 错误'
  END AS "验证结果"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 20;


-- 步骤 5: 重新计算用户余额（如果需要）
-- ========================================

-- 5.1 检查用户余额是否正确
-- 注意：这个查询假设初始余额为 10000
WITH UserBalanceCheck AS (
  SELECT
    u.id,
    u."displayName",
    u."demoBalance" AS "当前虚拟余额",
    COALESCE(SUM(CASE WHEN t."accountType" = 'DEMO' AND t.status = 'SETTLED'
                      THEN t."actualReturn" ELSE 0 END), 0) AS "累计虚拟收益",
    10000 + COALESCE(SUM(CASE WHEN t."accountType" = 'DEMO' AND t.status = 'SETTLED'
                              THEN t."actualReturn" ELSE 0 END), 0) AS "预期虚拟余额",
    u."realBalance" AS "当前真实余额",
    COALESCE(SUM(CASE WHEN t."accountType" = 'REAL' AND t.status = 'SETTLED'
                      THEN t."actualReturn" ELSE 0 END), 0) AS "累计真实收益",
    0 + COALESCE(SUM(CASE WHEN t."accountType" = 'REAL' AND t.status = 'SETTLED'
                          THEN t."actualReturn" ELSE 0 END), 0) AS "预期真实余额"
  FROM "User" u
  LEFT JOIN "TransactionLog" t ON t."userId" = u.id
  GROUP BY u.id, u."displayName", u."demoBalance", u."realBalance"
)
SELECT
  id,
  "displayName",
  "当前虚拟余额",
  "预期虚拟余额",
  "当前虚拟余额" - "预期虚拟余额" AS "虚拟余额差额",
  "当前真实余额",
  "预期真实余额",
  "当前真实余额" - "预期真实余额" AS "真实余额差额",
  CASE
    WHEN ABS("当前虚拟余额" - "预期虚拟余额") > 0.01 OR
         ABS("当前真实余额" - "预期真实余额") > 0.01
    THEN '❌ 需要修正'
    ELSE '✅ 正常'
  END AS "状态"
FROM UserBalanceCheck
WHERE ABS("当前虚拟余额" - "预期虚拟余额") > 0.01
   OR ABS("当前真实余额" - "预期真实余额") > 0.01;

-- 5.2 如果用户余额也错了，需要手动修正
-- 示例：修正某个用户的余额
-- UPDATE "User"
-- SET "demoBalance" = (
--   SELECT 10000 + COALESCE(SUM("actualReturn"), 0)
--   FROM "TransactionLog"
--   WHERE "userId" = 'USER_ID_HERE'
--     AND "accountType" = 'DEMO'
--     AND status = 'SETTLED'
-- )
-- WHERE id = 'USER_ID_HERE';


-- 步骤 6: 清理备份表（可选，确认无误后）
-- ========================================

-- DROP TABLE IF EXISTS "TransactionLog_Backup_SettledBalance";


-- ========================================
-- 使用说明
-- ========================================

-- 1. 先执行步骤 1，查看有多少错误数据
-- 2. 执行步骤 2，备份错误数据
-- 3. 执行步骤 3，修复错误数据（在事务中执行，可回滚）
-- 4. 执行步骤 4，验证修复结果
-- 5. 如果用户余额也错了，执行步骤 5
-- 6. 确认无误后，清理备份表

-- ========================================
-- 注意事项
-- ========================================

-- 1. 在执行修复前，务必先备份数据库
-- 2. 建议在测试环境先执行一遍
-- 3. 使用事务（BEGIN/COMMIT/ROLLBACK）来控制修复过程
-- 4. 修复后要验证数据的正确性
-- 5. 如果用户余额也错了，需要手动重新计算
