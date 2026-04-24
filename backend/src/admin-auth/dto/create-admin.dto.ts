import { IsString, IsEmail, MinLength, IsOptional, IsArray } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: '密码长度至少为8位' })
  password!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsArray()
  @IsOptional()
  permissions?: string[];

  @IsString()
  @IsOptional()
  remark?: string;
}
