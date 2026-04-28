import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  phoneNumber!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  demoBalance!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  realBalance!: number;

  @IsString()
  verificationStatus!: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsUrl()
  idCardFront?: string;

  @IsOptional()
  @IsUrl()
  idCardBack?: string;

  @IsOptional()
  @IsUrl()
  passportPhoto?: string;
}
