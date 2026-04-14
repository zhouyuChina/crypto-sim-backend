import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PublishPublicLegalContentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}
