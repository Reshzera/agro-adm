export type ToolPart = {
  type: `tool-${string}`
  toolCallId: string
  state: string
  input?: unknown
  output?: unknown
  errorText?: string
  approval?: { id: string; approved?: boolean }
}

export type Expense = {
  id: string
  amount: string
  date: string
  description: string
  category: string
  allocations?: Array<{ areaId: string | null; amount: string }>
}

export type Revenue = {
  id: string
  amount: string
  date: string
  description: string
}

export type FinancialSummaryOutput = {
  totalExpenses: string
  totalRevenues: string
  result: string
  expensesByCategory: Array<{ category: string; amount: string }>
}

export type ManualFormOutput = {
  kind: 'expense' | 'revenue'
  amount: string
  date: string
  description: string
  category?: string
}

export type ToolActions = {
  approve(approvalId: string, approved: boolean): void
  submitToolOutput(toolCallId: string, output: ManualFormOutput): void
}
