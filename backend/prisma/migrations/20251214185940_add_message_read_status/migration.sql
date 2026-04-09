-- Add index on isRead field for ChatMessage
CREATE INDEX IF NOT EXISTS "ChatMessage_isRead_idx" ON "ChatMessage"("isRead");
