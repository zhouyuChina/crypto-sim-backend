import { IsOptional, IsString } from 'class-validator';

export class UploadAvatarDto {
  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsString()
  description?: string;
}