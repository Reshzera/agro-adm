export type ExpenseCategory =
  | "FUEL"
  | "FEED_AND_SUPPLEMENT"
  | "FERTILIZER_AND_SEED"
  | "PESTICIDE"
  | "ANIMAL_HEALTH"
  | "PASTURE_AND_CROP_WORK"
  | "MACHINERY_AND_MAINTENANCE"
  | "LABOR"
  | "OTHER";

export type EntryType = "EXPENSE" | "REVENUE";

export type Allocation = {
  id: string;
  areaId: string | null;
  amount: string;
  area?: { name: string } | null;
};

export type FinancialEntry = {
  id: string;
  type: EntryType;
  amount: string;
  date: string;
  description: string;
  source: string;
  category?: ExpenseCategory;
  allocations?: Allocation[];
};

export type FinancialEntryListScope =
  | "ALL"
  | "EXPENSES_ONLY"
  | "REVENUES_ONLY";

export type FinancialEntryList = {
  scope: FinancialEntryListScope;
  entries: FinancialEntry[];
};

export type FinancialSummary = {
  totalExpenses: string;
  totalRevenues: string;
  result: string;
  expensesByCategory: { category: ExpenseCategory; amount: string }[];
};

export type FarmAreaOption = { id: string; name: string };
