DO $$
BEGIN
  CREATE TYPE "FundingType" AS ENUM ('DEPOSIT', 'WITHDRAW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FundingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FundingNetwork" AS ENUM ('TRC20');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FundingRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "FundingType" NOT NULL,
  "status" "FundingStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(18, 8) NOT NULL,
  "network" "FundingNetwork" NOT NULL DEFAULT 'TRC20',
  "txHash" TEXT,
  "toAddress" TEXT,
  "remark" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "balanceApplied" BOOLEAN NOT NULL DEFAULT false,
  "beforeRealBalance" DECIMAL(18, 8),
  "afterRealBalance" DECIMAL(18, 8),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FundingRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundingRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BalanceLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountType" "AccountType" NOT NULL DEFAULT 'REAL',
  "delta" DECIMAL(18, 8) NOT NULL,
  "beforeBalance" DECIMAL(18, 8) NOT NULL,
  "afterBalance" DECIMAL(18, 8) NOT NULL,
  "referenceId" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "operatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BalanceLedger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BalanceLedger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PublicLegalContent" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "homeAntiScam" JSONB NOT NULL,
  "tutorialSectionE" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicLegalContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FundingRecord_network_txHash_key"
  ON "FundingRecord"("network", "txHash");
CREATE INDEX IF NOT EXISTS "FundingRecord_userId_createdAt_idx"
  ON "FundingRecord"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FundingRecord_type_status_createdAt_idx"
  ON "FundingRecord"("type", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "FundingRecord_status_createdAt_idx"
  ON "FundingRecord"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "BalanceLedger_userId_createdAt_idx"
  ON "BalanceLedger"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BalanceLedger_referenceId_referenceType_idx"
  ON "BalanceLedger"("referenceId", "referenceType");

CREATE UNIQUE INDEX IF NOT EXISTS "PublicLegalContent_locale_key"
  ON "PublicLegalContent"("locale");
CREATE INDEX IF NOT EXISTS "PublicLegalContent_locale_isPublished_idx"
  ON "PublicLegalContent"("locale", "isPublished");
