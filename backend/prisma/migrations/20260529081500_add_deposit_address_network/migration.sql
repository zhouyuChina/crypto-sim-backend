-- FundingNetwork 扩展为真实链网络：TRC20 / ERC20 / BTC。
ALTER TYPE "FundingNetwork" ADD VALUE IF NOT EXISTS 'ERC20';
ALTER TYPE "FundingNetwork" ADD VALUE IF NOT EXISTS 'BTC';

-- 地址池按网络分组；旧地址默认视为 TRC20。
ALTER TABLE "DepositAddress"
ADD COLUMN IF NOT EXISTS "network" "FundingNetwork" NOT NULL DEFAULT 'TRC20';

CREATE INDEX IF NOT EXISTS "DepositAddress_network_enabled_riskStatus_idx"
ON "DepositAddress"("network", "enabled", "riskStatus");
