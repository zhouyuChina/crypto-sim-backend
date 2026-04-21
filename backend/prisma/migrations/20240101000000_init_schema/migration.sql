-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEMO', 'REAL');

-- CreateEnum
CREATE TYPE "LeaderboardType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "FundingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FundingNetwork" AS ENUM ('TRC20');

-- CreateEnum
CREATE TYPE "TradingSessionStatus" AS ENUM ('ACTIVE', 'STOPPED', 'PAUSED');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MarketSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MarketResult" AS ENUM ('PENDING', 'WIN', 'LOSE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmailVerificationType" AS ENUM ('REGISTER', 'RESET_PASSWORD', 'CHANGE_EMAIL', 'SECURITY');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "roles" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "avatar" TEXT,
    "idCardFront" TEXT,
    "idCardBack" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountBalance" DECIMAL(18,8) NOT NULL DEFAULT 10000,
    "totalProfitLoss" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "winRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "demoBalance" DECIMAL(18,8) NOT NULL DEFAULT 10000,
    "phoneNumber" TEXT,
    "realBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isCustomMember" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(18,8),
    "quantity" DECIMAL(18,8) NOT NULL,
    "filledQuantity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "fee" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "isMaker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "change24h" DECIMAL(7,2) NOT NULL,
    "raw" JSONB,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "orderNumber" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "expiryTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "entryPrice" DECIMAL(18,8) NOT NULL,
    "currentPrice" DECIMAL(18,8),
    "exitPrice" DECIMAL(18,8),
    "spread" DECIMAL(18,8) NOT NULL,
    "investAmount" DECIMAL(18,8) NOT NULL,
    "entryAccountBalance" DECIMAL(18,8),
    "returnRate" DECIMAL(7,4) NOT NULL,
    "actualReturn" DECIMAL(18,8) NOT NULL,
    "settledAccountBalance" DECIMAL(18,8),
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "manualAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "manualAdjustedById" TEXT,
    "manualAdjustedByName" TEXT,
    "manualAdjustmentReason" TEXT,
    "manualAdjustedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "accountType" "AccountType" NOT NULL DEFAULT 'DEMO',
    "isManaged" BOOLEAN NOT NULL DEFAULT false,
    "tradingCycleId" TEXT,
    "marketSessionId" TEXT,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselItem" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "type" "LeaderboardType" NOT NULL,
    "avatar" TEXT,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeCount" INTEGER NOT NULL,
    "winRate" DECIMAL(5,2) NOT NULL,
    "volume" DECIMAL(18,2) NOT NULL,
    "totalVolume" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "highestTrade" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lowestTrade" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingPerformance" (
    "id" TEXT NOT NULL,
    "tradeDuration" INTEGER NOT NULL,
    "winRate" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FundingType" NOT NULL,
    "status" "FundingStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,8) NOT NULL,
    "network" "FundingNetwork" NOT NULL DEFAULT 'TRC20',
    "txHash" TEXT,
    "toAddress" TEXT,
    "remark" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "balanceApplied" BOOLEAN NOT NULL DEFAULT false,
    "beforeRealBalance" DECIMAL(18,8),
    "afterRealBalance" DECIMAL(18,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'REAL',
    "delta" DECIMAL(18,8) NOT NULL,
    "beforeBalance" DECIMAL(18,8) NOT NULL,
    "afterBalance" DECIMAL(18,8) NOT NULL,
    "referenceId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicLegalContent" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicLegalContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingSession" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingCycle" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "initialResult" "MarketResult" NOT NULL DEFAULT 'PENDING',
    "actualResult" "MarketResult",
    "status" "MarketSessionStatus" NOT NULL DEFAULT 'PENDING',
    "tradeTypes" JSONB,
    "assetType" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "adminId" TEXT,
    "adminName" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'PENDING',
    "unreadUserCount" INTEGER NOT NULL DEFAULT 0,
    "unreadAdminCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessage" TEXT,
    "lastMessageType" "MessageType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderName" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "EmailVerificationType" NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_username_idx" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isCustomMember_idx" ON "User"("isCustomMember");

-- CreateIndex
CREATE INDEX "Order_userId_symbol_idx" ON "Order"("userId", "symbol");

-- CreateIndex
CREATE INDEX "Trade_symbol_createdAt_idx" ON "Trade"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "MarketSnapshot_symbol_createdAt_idx" ON "MarketSnapshot"("symbol", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLog_orderNumber_key" ON "TransactionLog"("orderNumber");

-- CreateIndex
CREATE INDEX "TransactionLog_userId_status_idx" ON "TransactionLog"("userId", "status");

-- CreateIndex
CREATE INDEX "TransactionLog_userId_accountType_idx" ON "TransactionLog"("userId", "accountType");

-- CreateIndex
CREATE INDEX "TransactionLog_orderNumber_idx" ON "TransactionLog"("orderNumber");

-- CreateIndex
CREATE INDEX "TransactionLog_assetType_createdAt_idx" ON "TransactionLog"("assetType", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionLog_entryTime_expiryTime_idx" ON "TransactionLog"("entryTime", "expiryTime");

-- CreateIndex
CREATE INDEX "TransactionLog_tradingCycleId_idx" ON "TransactionLog"("tradingCycleId");

-- CreateIndex
CREATE INDEX "TransactionLog_marketSessionId_idx" ON "TransactionLog"("marketSessionId");

-- CreateIndex
CREATE INDEX "TransactionLog_isManaged_idx" ON "TransactionLog"("isManaged");

-- CreateIndex
CREATE INDEX "Testimonial_createdAt_idx" ON "Testimonial"("createdAt");

-- CreateIndex
CREATE INDEX "CarouselItem_sortOrder_idx" ON "CarouselItem"("sortOrder");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_tradeCount_idx" ON "LeaderboardEntry"("type", "tradeCount");

-- CreateIndex
CREATE INDEX "TradingPerformance_tradeDuration_idx" ON "TradingPerformance"("tradeDuration");

-- CreateIndex
CREATE INDEX "FundingRecord_userId_createdAt_idx" ON "FundingRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FundingRecord_type_status_createdAt_idx" ON "FundingRecord"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FundingRecord_status_createdAt_idx" ON "FundingRecord"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FundingRecord_network_txHash_key" ON "FundingRecord"("network", "txHash");

-- CreateIndex
CREATE INDEX "BalanceLedger_userId_createdAt_idx" ON "BalanceLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BalanceLedger_referenceId_referenceType_idx" ON "BalanceLedger"("referenceId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "PublicLegalContent_locale_key" ON "PublicLegalContent"("locale");

-- CreateIndex
CREATE INDEX "PublicLegalContent_locale_isPublished_idx" ON "PublicLegalContent"("locale", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_category_idx" ON "SystemSettings"("category");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "TradingSession_userId_status_idx" ON "TradingSession"("userId", "status");

-- CreateIndex
CREATE INDEX "TradingSession_status_idx" ON "TradingSession"("status");

-- CreateIndex
CREATE INDEX "TradingSession_createdAt_idx" ON "TradingSession"("createdAt");

-- CreateIndex
CREATE INDEX "TradingCycle_tradingSessionId_cycleNumber_idx" ON "TradingCycle"("tradingSessionId", "cycleNumber");

-- CreateIndex
CREATE INDEX "TradingCycle_status_startTime_idx" ON "TradingCycle"("status", "startTime");

-- CreateIndex
CREATE INDEX "TradingCycle_assetType_startTime_idx" ON "TradingCycle"("assetType", "startTime");

-- CreateIndex
CREATE INDEX "MarketSession_status_startTime_idx" ON "MarketSession"("status", "startTime");

-- CreateIndex
CREATE INDEX "MarketSession_createdAt_idx" ON "MarketSession"("createdAt");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatConversation_adminId_idx" ON "ChatConversation"("adminId");

-- CreateIndex
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatConversation_status_createdAt_idx" ON "ChatConversation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_senderType_idx" ON "ChatMessage"("senderId", "senderType");

-- CreateIndex
CREATE INDEX "ChatMessage_isRead_idx" ON "ChatMessage"("isRead");

-- CreateIndex
CREATE INDEX "EmailVerification_email_type_idx" ON "EmailVerification"("email", "type");

-- CreateIndex
CREATE INDEX "EmailVerification_code_idx" ON "EmailVerification"("code");

-- CreateIndex
CREATE INDEX "EmailVerification_expiresAt_idx" ON "EmailVerification"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_tradingCycleId_fkey" FOREIGN KEY ("tradingCycleId") REFERENCES "TradingCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_marketSessionId_fkey" FOREIGN KEY ("marketSessionId") REFERENCES "MarketSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRecord" ADD CONSTRAINT "FundingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceLedger" ADD CONSTRAINT "BalanceLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingCycle" ADD CONSTRAINT "TradingCycle_tradingSessionId_fkey" FOREIGN KEY ("tradingSessionId") REFERENCES "TradingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

