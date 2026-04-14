import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class PartialHomeAntiScamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  tip1?: string;

  @IsOptional()
  @IsString()
  tip2?: string;

  @IsOptional()
  @IsString()
  tip3?: string;

  @IsOptional()
  @IsString()
  tip4?: string;

  @IsOptional()
  @IsString()
  suggestion?: string;
}

class PartialTutorialSectionEDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class PatchPublicLegalContentDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartialHomeAntiScamDto)
  homeAntiScam?: PartialHomeAntiScamDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartialTutorialSectionEDto)
  tutorialSectionE?: PartialTutorialSectionEDto;
}
