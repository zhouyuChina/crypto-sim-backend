-- 添加自定义会员相关字段到 User 表
-- Migration: add_custom_member_fields

-- 添加 isCustomMember 字段
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "isCustomMember" BOOLEAN NOT NULL DEFAULT false;

-- 添加 createdBy 字段（记录创建者的管理员ID）
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- 为 isCustomMember 字段创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "User_isCustomMember_idx" ON "User"("isCustomMember");

-- 添加注释
COMMENT ON COLUMN "User"."isCustomMember" IS '是否为自定义会员（后台创建的会员）';
COMMENT ON COLUMN "User"."createdBy" IS '创建者（管理员ID），仅自定义会员有值';
