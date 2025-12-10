import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';

import { EmailVerificationType } from './send-verification-code.dto';

export class VerifyCodeDto {
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code!: string;

  @IsNotEmpty({ message: '验证类型不能为空' })
  @IsEnum(EmailVerificationType, { message: '验证类型不正确' })
  type!: EmailVerificationType;
}
