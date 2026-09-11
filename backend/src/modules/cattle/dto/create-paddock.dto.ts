import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimmed } from './create-cattle-lot.dto';

export class CreatePaddockDto {
  @IsString()
  @Transform(trimmed)
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  hectares?: string | null;

  @IsOptional()
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  usableAreaHa?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxGrazingDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  minRestDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  plannedCapacityHead?: number | null;

  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(200)
  forageType?: string | null;
}
