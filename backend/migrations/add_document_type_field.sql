ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "documentType" TEXT;

-- 已有身份证图片的用户默认设为 id_card
UPDATE "User"
SET "documentType" = 'id_card'
WHERE "documentType" IS NULL
  AND ("idCardFront" IS NOT NULL OR "idCardBack" IS NOT NULL);
