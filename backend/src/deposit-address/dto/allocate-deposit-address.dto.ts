import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class AllocateDepositAddressDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;
}
