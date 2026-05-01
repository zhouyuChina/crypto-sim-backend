import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateFrontendIpWhitelistDto {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @Type(() => String)
  ips!: string[];
}

export class FrontendIpWhitelistResponseDto {
  enabled!: boolean;
  ips!: string[];
  confPath!: string;
  updatedAt?: Date;
}
