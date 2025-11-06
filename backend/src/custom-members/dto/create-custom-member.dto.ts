import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateCustomMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

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
}
