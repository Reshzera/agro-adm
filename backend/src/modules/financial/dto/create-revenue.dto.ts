import {
  IsDateString,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntrySource } from '@prisma/client';

export class CreateRevenueDto {
  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  amount!: string;

  @IsDateString({ strict: true })
  date!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  description!: string;

  @IsEnum(EntrySource)
  source!: EntrySource;
}
