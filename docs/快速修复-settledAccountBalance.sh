#!/bin/bash

# ========================================
# 快速修复 settledAccountBalance 错误数据
# ========================================

set -e  # 遇到错误立即退出

# 数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crypto_sim}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-your_password}"

echo "=========================================="
echo "修复 settledAccountBalance 错误数据"
echo "=========================================="
echo ""

# 步骤 1: 检查错误数据
echo "步骤 1: 检查错误数据..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  COUNT(*) AS "错误交易总数",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "总差额"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;
EOF

echo ""
read -p "发现错误数据，是否继续修复？(y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "取消修复"
  exit 0
fi

# 步骤 2: 备份错误数据
echo ""
echo "步骤 2: 备份错误数据..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
DROP TABLE IF EXISTS "TransactionLog_Backup_SettledBalance";

CREATE TABLE "TransactionLog_Backup_SettledBalance" AS
SELECT * FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

SELECT COUNT(*) AS "已备份记录数" FROM "TransactionLog_Backup_SettledBalance";
EOF

# 步骤 3: 修复错误数据
echo ""
echo "步骤 3: 修复错误数据..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
BEGIN;

UPDATE "TransactionLog"
SET "settledAccountBalance" = "entryAccountBalance" + "actualReturn"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

COMMIT;

SELECT '修复完成' AS "状态";
EOF

# 步骤 4: 验证修复结果
echo ""
echo "步骤 4: 验证修复结果..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- 检查是否还有错误数据
SELECT
  COUNT(*) AS "剩余错误数据"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;

-- 抽查修复后的数据
SELECT
  "orderNumber",
  "userName",
  ROUND("investAmount"::numeric, 2) AS "投资金额",
  ROUND("actualReturn"::numeric, 2) AS "实际收益",
  ROUND("entryAccountBalance"::numeric, 2) AS "开仓余额",
  ROUND("settledAccountBalance"::numeric, 2) AS "结算余额",
  ROUND(("settledAccountBalance" - "entryAccountBalance")::numeric, 2) AS "余额变化",
  CASE
    WHEN ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") < 0.01
    THEN '✅ 正确'
    ELSE '❌ 错误'
  END AS "验证结果"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
EOF

echo ""
echo "=========================================="
echo "修复完成！"
echo "=========================================="
echo ""
echo "提示："
echo "1. 备份数据已保存到 TransactionLog_Backup_SettledBalance 表"
echo "2. 如果需要回滚，请手动恢复备份数据"
echo "3. 确认无误后可删除备份表：DROP TABLE TransactionLog_Backup_SettledBalance;"
