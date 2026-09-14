import { tool } from 'ai';
import { createCattleLot } from './create-cattle-lot/implementation';
import { createCattleLotRegistry } from './create-cattle-lot/registry';
import { createExpense } from './create-expense/implementation';
import { createExpenseRegistry } from './create-expense/registry';
import { deleteExpense } from './delete-expense/implementation';
import { explainAttentionItem } from './explain-attention-item/implementation';
import { explainAttentionItemRegistry } from './explain-attention-item/registry';
import { getAttentionItems } from './get-attention-items/implementation';
import { getAttentionItemsRegistry } from './get-attention-items/registry';
import { deleteExpenseRegistry } from './delete-expense/registry';
import { createRevenue } from './create-revenue/implementation';
import { createRevenueRegistry } from './create-revenue/registry';
import { getExpenses } from './get-expenses/implementation';
import { getExpensesRegistry } from './get-expenses/registry';
import { getCattleOverview } from './get-cattle-overview/implementation';
import { getCattleOverviewRegistry } from './get-cattle-overview/registry';
import { getFarm } from './get-farm/implementation';
import { getFarmRegistry } from './get-farm/registry';
import { getFinancialSummary } from './get-financial-summary/implementation';
import { getFinancialSummaryRegistry } from './get-financial-summary/registry';
import { getRevenue } from './get-revenue/implementation';
import { getRevenueRegistry } from './get-revenue/registry';
import { moveCattleLot } from './move-cattle-lot/implementation';
import { openWorkspaceChartRegistry } from './open-workspace-chart/registry';
import { openWorkspaceEntityRegistry } from './open-workspace-entity/registry';
import { openWorkspaceMapRegistry } from './open-workspace-map/registry';
import { openWorkspaceTableRegistry } from './open-workspace-table/registry';
import { moveCattleLotRegistry } from './move-cattle-lot/registry';
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

export function chatTools(context: ToolContext) {
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
    getCattleOverview: tool({
      ...getCattleOverviewRegistry,
      execute: () => getCattleOverview(context),
    }),
    getAttentionItems: tool({
      ...getAttentionItemsRegistry,
      execute: () => getAttentionItems(context),
    }),
    explainAttentionItem: tool({
      ...explainAttentionItemRegistry,
      execute: (input) => explainAttentionItem(context, input),
    }),
    createCattleLot: tool({
      ...createCattleLotRegistry,
      execute: (input) => createCattleLot(context, input),
    }),
    moveCattleLot: tool({
      ...moveCattleLotRegistry,
      execute: (input, { toolCallId }) =>
        moveCattleLot(context, input, toolCallId),
    }),
    showManualForm: tool(showManualFormRegistry),
    openWorkspaceTable: tool(openWorkspaceTableRegistry),
    openWorkspaceEntity: tool(openWorkspaceEntityRegistry),
    openWorkspaceChart: tool(openWorkspaceChartRegistry),
    openWorkspaceMap: tool(openWorkspaceMapRegistry),
  };
}
