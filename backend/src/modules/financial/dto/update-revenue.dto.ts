import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntrySource } from '@prisma/client';

export class UpdateRevenueDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  amount?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  description?: string;

  @IsOptional()
  @IsEnum(EntrySource)
  source?: EntrySource;
}
