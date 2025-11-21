import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePhoneDto {
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  phoneNumber!: string;
}
