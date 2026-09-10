import type { EntryType, ExpenseCategory } from "./responses";

export type FinancialFilters = {
  from?: string;
  to?: string;
  type?: EntryType;
  category?: ExpenseCategory;
};

export type FinancialEntryPayload = {
  id?: string;
  amount?: string;
  date?: string;
  description?: string;
  source: "MANUAL";
  category?: ExpenseCategory;
  allocations?: { areaId: string | null; amount: string }[];
};
