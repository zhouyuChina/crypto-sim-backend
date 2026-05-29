import { Type } from 'class-transformer';
import { FundingNetwork } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class AllocateDepositAddressDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsEnum(FundingNetwork)
  network?: FundingNetwork;
}
