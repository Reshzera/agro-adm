import { IsOptional, IsString, Matches } from 'class-validator';

export class ExpenseAllocationDto {
  @IsOptional()
  @IsString()
  areaId!: string | null;

  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/, {
    message: 'amount must be a monetary value with at most two decimal places.',
  })
  amount!: string;
}
