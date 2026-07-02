-- DropIndex
DROP INDEX IF EXISTS "DepositAddress_enabled_riskStatus_idx";

-- AlterTable
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "adminRemark" TEXT,
ADD COLUMN IF NOT EXISTS "documentType" TEXT,
ADD COLUMN IF NOT EXISTS "passportPhoto" TEXT,
ADD COLUMN IF NOT EXISTS "tradeDurations" JSONB;
