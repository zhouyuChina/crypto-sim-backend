import { IsNumber, IsPositive } from 'class-validator';

export class UpdatePriceDto {
  @IsNumber()
  @IsPositive()
  currentPrice!: number; // 当前价格（前端实时更新）
}
