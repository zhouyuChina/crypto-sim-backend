import { IsOptional, IsString, IsEmail, IsBoolean, IsEnum, IsArray, IsUrl } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  TRADER = 'trader',
  VIEWER = 'viewer',
}

export enum VerificationStatus {
  PENDING = 'PENDING',      // 待审核
  IN_REVIEW = 'IN_REVIEW',  // 审核中
  VERIFIED = 'VERIFIED',     // 验证成功
  REJECTED = 'REJECTED',     // 验证失败
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;
}
