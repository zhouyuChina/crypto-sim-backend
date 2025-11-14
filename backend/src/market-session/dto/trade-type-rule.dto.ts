import { ArrayMinSize, IsArray, IsInt, IsString, Min } from 'class-validator';

export class TradeTypeRuleDto {
  @IsString()
  assetType!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  durations!: number[];
}
