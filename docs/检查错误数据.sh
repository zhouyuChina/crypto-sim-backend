#!/bin/bash

# ========================================
# 检查 settledAccountBalance 错误数据
# ========================================

# 数据库连接信息（可通过环境变量覆盖）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crypto_sim}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD}"

# 检查密码是否设置
if [ -z "$DB_PASSWORD" ]; then
  echo "错误：请设置 DB_PASSWORD 环境变量"
  echo "用法: DB_PASSWORD=your_password ./docs/检查错误数据.sh"
  exit 1
fi

echo "=========================================="
echo "检查 settledAccountBalance 错误数据"
echo "=========================================="
echo ""
echo "连接信息:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 1. 统计错误数据总数
echo "=========================================="
echo "1. 错误数据统计"
echo "=========================================="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  COUNT(*) AS "错误交易总数",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "总差额"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01;
EOF

# 2. 查看错误数据详情
echo ""
echo "=========================================="
echo "2. 错误数据详情（前 10 条）"
echo "=========================================="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  "orderNumber" AS "订单号",
  "userName" AS "用户",
  ROUND("investAmount"::numeric, 2) AS "投资",
  ROUND("actualReturn"::numeric, 2) AS "收益",
  ROUND("entryAccountBalance"::numeric, 2) AS "开仓余额",
  ROUND("settledAccountBalance"::numeric, 2) AS "结算余额",
  ROUND((("settledAccountBalance" - "entryAccountBalance") - "actualReturn")::numeric, 2) AS "差额",
  "accountType" AS "类型"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
ORDER BY "createdAt" DESC
LIMIT 10;
EOF

# 3. 按账户类型统计
echo ""
echo "=========================================="
echo "3. 按账户类型统计"
echo "=========================================="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  "accountType" AS "账户类型",
  COUNT(*) AS "错误数量",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "差额总和"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
GROUP BY "accountType";
EOF

# 4. 按用户统计
echo ""
echo "=========================================="
echo "4. 受影响用户（前 5 名）"
echo "=========================================="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  "userName" AS "用户名",
  COUNT(*) AS "错误交易数",
  ROUND(SUM(ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn"))::numeric, 2) AS "累计差额"
FROM "TransactionLog"
WHERE "settledAccountBalance" IS NOT NULL
  AND "entryAccountBalance" IS NOT NULL
  AND ABS(("settledAccountBalance" - "entryAccountBalance") - "actualReturn") > 0.01
GROUP BY "userName"
ORDER BY COUNT(*) DESC
LIMIT 5;
EOF

# 5. 检查 NULL 值
echo ""
echo "=========================================="
echo "5. NULL 值检查"
echo "=========================================="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
  COUNT(*) AS "总交易数",
  COUNT(CASE WHEN "entryAccountBalance" IS NULL THEN 1 END) AS "缺少开仓余额",
  COUNT(CASE WHEN "settledAccountBalance" IS NULL AND status = 'SETTLED' THEN 1 END) AS "已结算但无结算余额"
FROM "TransactionLog";
EOF

echo ""
echo "=========================================="
echo "检查完成！"
echo "=========================================="
echo ""
echo "提示："
echo "  如需修复错误数据，请执行: ./docs/快速修复-settledAccountBalance.sh"
