import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class TutorialSectionADto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  example!: string;
}

export class TutorialSectionBStepDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;

  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

export class TutorialSectionBDto {
  @IsString()
  title!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TutorialSectionBStepDto)
  steps!: TutorialSectionBStepDto[];
}

export class TutorialSectionCDto {
  @IsString()
  title!: string;
}

export class TutorialSectionDDto {
  @IsString()
  title!: string;

  @IsString()
  simulationTitle!: string;

  @IsString()
  simulationContent!: string;

  @IsString()
  realTitle!: string;

  @IsString()
  realContent!: string;

  @IsString()
  note!: string;
}

export class UpsertTutorialDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version!: number;

  @ValidateNested()
  @Type(() => TutorialSectionADto)
  sectionA!: TutorialSectionADto;

  @ValidateNested()
  @Type(() => TutorialSectionBDto)
  sectionB!: TutorialSectionBDto;

  @ValidateNested()
  @Type(() => TutorialSectionCDto)
  sectionC!: TutorialSectionCDto;

  @ValidateNested()
  @Type(() => TutorialSectionDDto)
  sectionD!: TutorialSectionDDto;
}
