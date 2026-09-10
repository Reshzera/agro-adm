import type { ExpenseCategory } from '@prisma/client';

export type MoneyInput = string | number;

export type FinancialPeriod = {
  from?: string | Date;
  to?: string | Date;
};

export type ExpenseListFilters = FinancialPeriod & {
  category?: ExpenseCategory;
  term?: string;
};

export type FinancialEntryType = 'EXPENSE' | 'REVENUE';

export type FinancialEntryListFilters = ExpenseListFilters & {
  type?: FinancialEntryType;
};
