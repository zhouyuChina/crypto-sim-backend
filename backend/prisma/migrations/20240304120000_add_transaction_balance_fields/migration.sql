-- Add account balance snapshots to transaction logs
ALTER TABLE "TransactionLog"
  ADD COLUMN "entryAccountBalance" DECIMAL(18, 8),
  ADD COLUMN "settledAccountBalance" DECIMAL(18, 8);
