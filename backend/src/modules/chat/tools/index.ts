import { tool } from 'ai';
import type { FinancialService } from '../../financial/financial.service';
import type { FarmService } from '../../farm/farm.service';
import { createExpense } from './create-expense/implementation';
import { createExpenseRegistry } from './create-expense/registry';
import { deleteExpense } from './delete-expense/implementation';
import { deleteExpenseRegistry } from './delete-expense/registry';
import { createRevenue } from './create-revenue/implementation';
import { createRevenueRegistry } from './create-revenue/registry';
import { getExpenses } from './get-expenses/implementation';
import { getExpensesRegistry } from './get-expenses/registry';
import { getFarm } from './get-farm/implementation';
import { getFarmRegistry } from './get-farm/registry';
import { getFinancialSummary } from './get-financial-summary/implementation';
import { getFinancialSummaryRegistry } from './get-financial-summary/registry';
import { getRevenue } from './get-revenue/implementation';
import { getRevenueRegistry } from './get-revenue/registry';
import { showManualFormRegistry } from './show-manual-form/registry';
import { updateExpense } from './update-expense/implementation';
import { updateExpenseRegistry } from './update-expense/registry';
import { updateFarm } from './update-farm/implementation';
import { updateFarmRegistry } from './update-farm/registry';
import { updateFarmContext } from './update-farm-context/implementation';
import { updateFarmContextRegistry } from './update-farm-context/registry';
import { updateRevenue } from './update-revenue/implementation';
import { updateRevenueRegistry } from './update-revenue/registry';
import type { ToolContext } from './types';

export function chatTools(
  farmId: string,
  now: Date,
  financial: FinancialService,
  farms: FarmService,
) {
  const context: ToolContext = {
    farmId,
    now,
    financial,
    farms,
  };
  return {
    getFarm: tool({ ...getFarmRegistry, execute: () => getFarm(context) }),
    updateFarm: tool({
      ...updateFarmRegistry,
      execute: (input) => updateFarm(context, input),
    }),
    updateFarmContext: tool({
      ...updateFarmContextRegistry,
      execute: (input) => updateFarmContext(context, input),
    }),
    createExpense: tool({
      ...createExpenseRegistry,
      execute: (input) => createExpense(context, input),
    }),
    createRevenue: tool({
      ...createRevenueRegistry,
      execute: (input) => createRevenue(context, input),
    }),
    deleteExpense: tool({
      ...deleteExpenseRegistry,
      execute: (input) => deleteExpense(context, input),
    }),
    updateExpense: tool({
      ...updateExpenseRegistry,
      execute: (input) => updateExpense(context, input),
    }),
    updateRevenue: tool({
      ...updateRevenueRegistry,
      execute: (input) => updateRevenue(context, input),
    }),
    getExpenses: tool({
      ...getExpensesRegistry,
      execute: (input) => getExpenses(context, input),
    }),
    getRevenue: tool({
      ...getRevenueRegistry,
      execute: (input) => getRevenue(context, input),
    }),
    getFinancialSummary: tool({
      ...getFinancialSummaryRegistry,
      execute: (input) => getFinancialSummary(context, input),
    }),
    showManualForm: tool(showManualFormRegistry),
  };
}
