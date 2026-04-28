import { IsEnum, IsNotEmpty } from 'class-validator';

export enum IdCardType {
  FRONT = 'front',
  BACK = 'back',
  PASSPORT = 'passport',
}

export class UploadIdCardDto {
  @IsEnum(IdCardType)
  @IsNotEmpty()
  type!: IdCardType;
}
