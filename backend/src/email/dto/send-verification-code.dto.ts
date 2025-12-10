import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';

export enum EmailVerificationType {
  REGISTER = 'REGISTER',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CHANGE_EMAIL = 'CHANGE_EMAIL',
  SECURITY = 'SECURITY',
}

export class SendVerificationCodeDto {
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsNotEmpty({ message: '验证类型不能为空' })
  @IsEnum(EmailVerificationType, { message: '验证类型不正确' })
  type!: EmailVerificationType;
}
