-- DropIndex
DROP INDEX "DepositAddress_enabled_riskStatus_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminRemark" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "passportPhoto" TEXT,
ADD COLUMN     "tradeDurations" JSONB;
