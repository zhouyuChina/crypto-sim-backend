-- CreateEnum
CREATE TYPE "ContactSupportStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ContactSupportMessage" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "ContactSupportStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactSupportMessage_email_idx" ON "ContactSupportMessage"("email");

-- CreateIndex
CREATE INDEX "ContactSupportMessage_status_createdAt_idx" ON "ContactSupportMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSupportMessage_createdAt_idx" ON "ContactSupportMessage"("createdAt");
