import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ContactSupportDto {
  @Transform(trimString)
  @IsNotEmpty({ message: 'email, subject and message are required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @Transform(trimString)
  @IsString({ message: 'Subject is required' })
  @IsNotEmpty({ message: 'Subject is required' })
  @MaxLength(200, { message: 'Subject is too long' })
  subject!: string;

  @Transform(trimString)
  @IsString({ message: 'Message is required' })
  @IsNotEmpty({ message: 'Message is required' })
  @MaxLength(5000, { message: 'Message is too long' })
  message!: string;
}
