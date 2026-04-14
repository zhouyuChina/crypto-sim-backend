import { Type } from 'class-transformer';
import { IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class HomeAntiScamDto {
  @IsString()
  title!: string;

  @IsString()
  tip1!: string;

  @IsString()
  tip2!: string;

  @IsString()
  tip3!: string;

  @IsString()
  tip4!: string;

  @IsString()
  suggestion!: string;
}

export class TutorialSectionEDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

export class UpsertPublicLegalContentDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;

  @ValidateNested()
  @Type(() => HomeAntiScamDto)
  homeAntiScam!: HomeAntiScamDto;

  @ValidateNested()
  @Type(() => TutorialSectionEDto)
  tutorialSectionE!: TutorialSectionEDto;
}
