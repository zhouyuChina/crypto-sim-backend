import { IsString, MinLength } from 'class-validator';

export class UpdateWithdrawAddressDto {
  @IsString()
  @MinLength(1)
  toAddress!: string;
}
