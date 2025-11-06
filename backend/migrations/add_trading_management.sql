-- 创建交易托管会话状态枚举
DO $$ BEGIN
  CREATE TYPE "TradingSessionStatus" AS ENUM ('ACTIVE', 'STOPPED', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建交易周期状态枚举
DO $$ BEGIN
  CREATE TYPE "CycleStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建交易托管会话表
CREATE TABLE IF NOT EXISTS "TradingSession" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "userName" TEXT,
  "status" "TradingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "cycleIntervalSec" INTEGER NOT NULL,
  "assetType" TEXT NOT NULL,
  "accountType" "AccountType" NOT NULL DEFAULT 'DEMO',
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stoppedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建交易周期表
CREATE TABLE IF NOT EXISTS "TradingCycle" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tradingSessionId" TEXT NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "assetType" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "startPrice" DECIMAL(18,8),
  "endPrice" DECIMAL(18,8),
  "status" "CycleStatus" NOT NULL DEFAULT 'PENDING',
  "transactionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradingCycle_tradingSessionId_fkey" FOREIGN KEY ("tradingSessionId") REFERENCES "TradingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 为 TransactionLog 表添加 tradingCycleId 字段
ALTER TABLE "TransactionLog"
ADD COLUMN IF NOT EXISTS "tradingCycleId" TEXT;

-- 添加外键约束
DO $$ BEGIN
  ALTER TABLE "TransactionLog"
  ADD CONSTRAINT "TransactionLog_tradingCycleId_fkey"
  FOREIGN KEY ("tradingCycleId") REFERENCES "TradingCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS "TradingSession_userId_status_idx" ON "TradingSession"("userId", "status");
CREATE INDEX IF NOT EXISTS "TradingSession_status_idx" ON "TradingSession"("status");
CREATE INDEX IF NOT EXISTS "TradingSession_createdAt_idx" ON "TradingSession"("createdAt");

CREATE INDEX IF NOT EXISTS "TradingCycle_tradingSessionId_cycleNumber_idx" ON "TradingCycle"("tradingSessionId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "TradingCycle_status_startTime_idx" ON "TradingCycle"("status", "startTime");
CREATE INDEX IF NOT EXISTS "TradingCycle_assetType_startTime_idx" ON "TradingCycle"("assetType", "startTime");

CREATE INDEX IF NOT EXISTS "TransactionLog_tradingCycleId_idx" ON "TransactionLog"("tradingCycleId");
CREATE INDEX IF NOT EXISTS "TransactionLog_isManaged_idx" ON "TransactionLog"("isManaged");
