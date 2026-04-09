-- Add read status fields to ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
