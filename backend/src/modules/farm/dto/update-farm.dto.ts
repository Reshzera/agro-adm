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

function trimmedOrNull({ value }: { value: unknown }): unknown {
  if (value === null) return null;
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateFarmDto {
  @IsOptional()
  @IsString()
  @Transform(trimmedOrNull)
  @MinLength(1)
  @MaxLength(200)
  name?: string | null;

  @IsOptional()
  @Transform(trimmedOrNull)
  @Matches(/^\d+(?:\.\d{1,2})?$/, {
    message: 'totalAreaHa must have at most two decimal places.',
  })
  totalAreaHa?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimmedOrNull)
  @MinLength(1)
  @MaxLength(200)
  primaryActivity?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimmedOrNull)
  @MinLength(1)
  @MaxLength(300)
  location?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimmedOrNull)
  @MinLength(1)
  @MaxLength(500)
  mainCrops?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  approximateAnimalCount?: number | null;

  @IsOptional()
  @IsString()
  @Transform(trimmedOrNull)
  @MaxLength(10_000)
  agentContext?: string | null;
}
