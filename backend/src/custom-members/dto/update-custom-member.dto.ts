import { IsString, IsOptional, IsEmail, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class UpdateCustomMemberDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsNumber()
  @IsOptional()
  demoBalance?: number;

  @IsNumber()
  @IsOptional()
  realBalance?: number;

  @IsEnum(['PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'])
  @IsOptional()
  verificationStatus?: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
