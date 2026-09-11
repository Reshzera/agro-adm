import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CattleCategory } from '@prisma/client';

export function trimmed({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateCattleLotDto {
  @IsString()
  @Transform(trimmed)
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEnum(CattleCategory)
  category!: CattleCategory;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  headCount!: number;

  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(300)
  purpose?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  startedOn?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(2_000)
  notes?: string | null;
}
