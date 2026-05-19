-- CreateEnum
CREATE TYPE "DepositAddressRisk" AS ENUM ('UNKNOWN', 'SAFE', 'RISKY');

-- CreateTable
CREATE TABLE "DepositAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "qrCodeUrl" TEXT NOT NULL,
    "minAmount" DECIMAL(18,8) NOT NULL,
    "maxAmount" DECIMAL(18,8),
    "capacity" DECIMAL(18,8),
    "usedAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "riskStatus" "DepositAddressRisk" NOT NULL DEFAULT 'UNKNOWN',
    "lastRiskCheckAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositAllocation" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositAddress_address_key" ON "DepositAddress"("address");

-- CreateIndex
CREATE INDEX "DepositAddress_enabled_riskStatus_idx" ON "DepositAddress"("enabled", "riskStatus");

-- CreateIndex
CREATE INDEX "DepositAddress_minAmount_maxAmount_idx" ON "DepositAddress"("minAmount", "maxAmount");

-- CreateIndex
CREATE INDEX "DepositAllocation_expiresAt_consumed_idx" ON "DepositAllocation"("expiresAt", "consumed");

-- CreateIndex
CREATE INDEX "DepositAllocation_userId_createdAt_idx" ON "DepositAllocation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DepositAllocation_addressId_consumed_idx" ON "DepositAllocation"("addressId", "consumed");

-- AddForeignKey
ALTER TABLE "DepositAllocation" ADD CONSTRAINT "DepositAllocation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "DepositAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 数据迁移：把旧的 SystemSettings('deposit.address') 单条配置搬到新表
-- 仅当旧记录存在且地址非空、且新表不存在该地址时迁移
INSERT INTO "DepositAddress" (
  "id", "address", "qrCodeUrl", "minAmount", "maxAmount", "capacity",
  "usedAmount", "pendingAmount", "enabled", "riskStatus", "sortOrder",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  TRIM(s."value"->>'address'),
  COALESCE(s."value"->>'qrCodeUrl', ''),
  10,
  NULL,
  NULL,
  0,
  0,
  TRUE,
  'UNKNOWN',
  0,
  NOW(),
  NOW()
FROM "SystemSettings" s
WHERE s."key" = 'deposit.address'
  AND s."value"->>'address' IS NOT NULL
  AND TRIM(s."value"->>'address') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "DepositAddress" d WHERE d."address" = TRIM(s."value"->>'address')
  );

-- 删除旧 SystemSettings 配置
DELETE FROM "SystemSettings" WHERE "key" = 'deposit.address';

