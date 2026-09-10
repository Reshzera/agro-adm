import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EntrySource, ExpenseCategory } from '@prisma/client';
import { ExpenseAllocationDto } from './expense-allocation.dto';

export class CreateExpenseDto {
  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/, {
    message: 'amount must be a monetary value with at most two decimal places.',
  })
  amount!: string;

  @IsDateString({ strict: true })
  date!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  description!: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsEnum(EntrySource)
  source!: EntrySource;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseAllocationDto)
  allocations?: ExpenseAllocationDto[];
}
