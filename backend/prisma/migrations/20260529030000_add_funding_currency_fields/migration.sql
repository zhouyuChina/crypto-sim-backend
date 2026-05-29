-- AlterTable: FundingRecord 新增币种与原始金额字段
ALTER TABLE "FundingRecord"
ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USDT',
ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(18,8),
ADD COLUMN IF NOT EXISTS "convertedAmount" DECIMAL(18,8);

-- 旧入金记录兜底：币种设为 USDT，originalAmount/convertedAmount 与 amount 相同
UPDATE "FundingRecord"
SET
  "currency"        = COALESCE("currency", 'USDT'),
  "originalAmount"  = COALESCE("originalAmount", "amount"),
  "convertedAmount" = COALESCE("convertedAmount", "amount")
WHERE "type" = 'DEPOSIT';
