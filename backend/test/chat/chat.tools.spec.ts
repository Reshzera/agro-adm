import { EntrySource } from '@prisma/client';
import { jest } from '@jest/globals';
import type { ToolExecutionOptions } from 'ai';
import { chatTools } from '../../src/modules/chat/tools';
import { createExpenseRegistry } from '../../src/modules/chat/tools/create-expense/registry';
import { createRevenueRegistry } from '../../src/modules/chat/tools/create-revenue/registry';
import { getExpensesRegistry } from '../../src/modules/chat/tools/get-expenses/registry';
import { getFarmRegistry } from '../../src/modules/chat/tools/get-farm/registry';
import { getFinancialSummaryRegistry } from '../../src/modules/chat/tools/get-financial-summary/registry';
import { getRevenueRegistry } from '../../src/modules/chat/tools/get-revenue/registry';
import { updateExpenseRegistry } from '../../src/modules/chat/tools/update-expense/registry';
import { updateFarmRegistry } from '../../src/modules/chat/tools/update-farm/registry';
import { updateFarmContextRegistry } from '../../src/modules/chat/tools/update-farm-context/registry';
import { updateRevenueRegistry } from '../../src/modules/chat/tools/update-revenue/registry';
import type { FinancialService } from '../../src/modules/financial/financial.service';
import type { FarmService } from '../../src/modules/farm/farm.service';

const FARM_ID = 'farm-from-auth-context';
const NOW = new Date('2026-03-16T09:00:00.000Z');
const TOOL_EXECUTION_OPTIONS: ToolExecutionOptions = {
  toolCallId: 'test-tool-call',
  messages: [],
};

function toolsForTest() {
  const financial = {
    createExpense: jest.fn((_farmId: string, input: unknown) =>
      Promise.resolve(input),
    ),
    createRevenue: jest.fn(),
    updateExpense: jest.fn(),
    updateRevenue: jest.fn(),
    listExpenses: jest.fn(),
    listRevenues: jest.fn(),
    getFinancialSummary: jest.fn(),
  };
  const farms = {
    getForAgent: jest.fn(() =>
      Promise.resolve({
        id: FARM_ID,
        agentContext: '# Contexto anterior',
      }),
    ),
    updateForAgent: jest.fn((_farmId: string, input: unknown) =>
      Promise.resolve(input),
    ),
  };

  return {
    tools: chatTools(
      FARM_ID,
      NOW,
      financial as unknown as FinancialService,
      farms as unknown as FarmService,
    ),
    financial,
    farms,
  };
}

describe('chat financial tools', () => {
  it('creates an expense for the authenticated farm with allocations and a resolved relative date', async () => {
    const { tools, financial } = toolsForTest();

    await tools.createExpense.execute!(
      {
        amount: '4800.00',
        date: 'ontem',
        description: 'diesel para o trator',
        category: 'FUEL',
        allocations: [{ areaId: 'pasto-4', amount: '4800.00' }],
      },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(financial.createExpense).toHaveBeenCalledWith(FARM_ID, {
      amount: '4800.00',
      date: '2026-03-15',
      description: 'diesel para o trator',
      category: 'FUEL',
      allocations: [{ areaId: 'pasto-4', amount: '4800.00' }],
      source: EntrySource.WEB_AGENT,
    });
  });

  it('has no tool input that accepts a farm id', () => {
    const schemas = [
      getFarmRegistry.inputSchema,
      updateFarmRegistry.inputSchema,
      updateFarmContextRegistry.inputSchema,
      createExpenseRegistry.inputSchema,
      createRevenueRegistry.inputSchema,
      updateExpenseRegistry.inputSchema,
      updateRevenueRegistry.inputSchema,
      getExpensesRegistry.inputSchema,
      getRevenueRegistry.inputSchema,
      getFinancialSummaryRegistry.inputSchema,
    ];

    for (const schema of schemas) {
      expect(Object.keys(schema.shape)).not.toContain('farmId');
    }
    expect(
      getFarmRegistry.inputSchema.safeParse({ farmId: 'attempted-override' })
        .success,
    ).toBe(false);
  });

  it('replaces the qualitative farm context instead of appending to it', async () => {
    const { tools, farms } = toolsForTest();
    const context = '# Fazenda\n\n- Produz milho safrinha.';

    await tools.updateFarmContext.execute!(
      {
        previousContext: '# Contexto anterior',
        context,
      },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(farms.updateForAgent).toHaveBeenCalledWith(FARM_ID, {
      agentContext: context,
    });
  });
});
