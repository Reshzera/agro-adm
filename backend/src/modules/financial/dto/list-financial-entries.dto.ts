import { ExpenseCategory } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';

export class ListFinancialEntriesDto {
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @IsOptional()
  @IsIn(['EXPENSE', 'REVENUE'])
  type?: 'EXPENSE' | 'REVENUE';

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}
