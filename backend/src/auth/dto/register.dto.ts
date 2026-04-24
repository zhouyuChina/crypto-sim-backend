import { IsArray, IsEmail, IsOptional, IsString, Length, MinLength, IsUrl } from 'class-validator';

import type { Role } from '../../common/decorators/roles.decorator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsArray()
  roles?: Role[];

  /** 邮箱验证码（6 位数字，通过 /api/email/send-verification-code 获取，type=REGISTER） */
  @IsString()
  @Length(6, 6, { message: '验证码必须为 6 位数字' })
  verificationCode!: string;
}
