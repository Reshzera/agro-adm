import { ActorType, DomainEventSource, EntrySource } from '@prisma/client';
import { jest } from '@jest/globals';
import type { ToolExecutionOptions } from 'ai';
import { chatTools } from '../../src/modules/chat/tools';
import { createCattleLotRegistry } from '../../src/modules/chat/tools/create-cattle-lot/registry';
import { createExpenseRegistry } from '../../src/modules/chat/tools/create-expense/registry';
import { deleteExpenseRegistry } from '../../src/modules/chat/tools/delete-expense/registry';
import { createRevenueRegistry } from '../../src/modules/chat/tools/create-revenue/registry';
import { getExpensesRegistry } from '../../src/modules/chat/tools/get-expenses/registry';
import { getCattleOverviewRegistry } from '../../src/modules/chat/tools/get-cattle-overview/registry';
import { getFarmRegistry } from '../../src/modules/chat/tools/get-farm/registry';
import { getFinancialSummaryRegistry } from '../../src/modules/chat/tools/get-financial-summary/registry';
import { getRevenueRegistry } from '../../src/modules/chat/tools/get-revenue/registry';
import { moveCattleLotRegistry } from '../../src/modules/chat/tools/move-cattle-lot/registry';
import { openWorkspaceChartRegistry } from '../../src/modules/chat/tools/open-workspace-chart/registry';
import { openWorkspaceEntityRegistry } from '../../src/modules/chat/tools/open-workspace-entity/registry';
import { openWorkspaceMapRegistry } from '../../src/modules/chat/tools/open-workspace-map/registry';
import { openWorkspaceTableRegistry } from '../../src/modules/chat/tools/open-workspace-table/registry';
import { showManualFormRegistry } from '../../src/modules/chat/tools/show-manual-form/registry';
import { updateExpenseRegistry } from '../../src/modules/chat/tools/update-expense/registry';
import { updateFarmRegistry } from '../../src/modules/chat/tools/update-farm/registry';
import { updateFarmContextRegistry } from '../../src/modules/chat/tools/update-farm-context/registry';
import { updateRevenueRegistry } from '../../src/modules/chat/tools/update-revenue/registry';
import type { CattleService } from '../../src/modules/cattle/cattle.service';
import type { FinancialService } from '../../src/modules/financial/financial.service';
import type { FarmService } from '../../src/modules/farm/farm.service';

const FARM_ID = 'farm-from-auth-context';
const ACTOR_ID = 'user-from-auth-context';
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
    deleteExpense: jest.fn(),
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
  const cattle = {
    listLots: jest.fn(() =>
      Promise.resolve([
        {
          id: 'lot-12',
          name: 'Lote 12',
          category: 'STEERS',
          headCount: 180,
          active: true,
          currentOccupancy: {
            paddock: { id: 'paddock-4', name: 'Pasto 4' },
          },
        },
      ]),
    ),
    listPaddocks: jest.fn(() =>
      Promise.resolve([
        {
          id: 'paddock-6',
          name: 'Pasto 6',
          active: true,
          plannedCapacityHead: null,
          usableAreaHa: '49.00',
          boundary: {
            space: 'geo',
            version: 1,
            points: [
              [-54.046346, -19.531769],
              [-54.038305, -19.532341],
              [-54.039109, -19.538063],
            ],
            computedAreaHa: '63.00',
          },
          areaDivergence: {
            computedAreaHa: '63.00',
            usableAreaHa: '49.00',
            differencePercent: 28.6,
            significant: true,
          },
          occupancies: [],
        },
      ]),
    ),
    createLot: jest.fn((_farmId: string, input: unknown) =>
      Promise.resolve(input),
    ),
    moveLot: jest.fn(() =>
      Promise.resolve({
        movement: {
          id: 'movement-1',
          lot: { id: 'lot-12', name: 'Lote 12', headCount: 180 },
          fromPaddock: { id: 'paddock-4', name: 'Pasto 4' },
          toPaddock: { id: 'paddock-6', name: 'Pasto 6' },
          occurredAt: '2026-03-16T09:00:00.000Z',
        },
      }),
    ),
  };
  return {
    tools: chatTools({
      farmId: FARM_ID,
      actorId: ACTOR_ID,
      now: NOW,
      financial: financial as unknown as FinancialService,
      farms: farms as unknown as FarmService,
      cattle: cattle as unknown as CattleService,
    }),
    financial,
    farms,
    cattle,
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

  it('accepts the Brazilian date format the model emits, and still rejects impossible dates', async () => {
    const { tools, financial } = toolsForTest();

    await tools.createExpense.execute!(
      {
        amount: '3150.00',
        date: '09/03/2026',
        description: 'vacina de aftosa',
        category: 'ANIMAL_HEALTH',
      },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(financial.createExpense).toHaveBeenCalledWith(
      FARM_ID,
      expect.objectContaining({ date: '2026-03-09' }),
    );

    await expect(
      tools.getExpenses.execute!(
        { from: '31/02/2026' },
        TOOL_EXECUTION_OPTIONS,
      ),
    ).rejects.toThrow();
  });

  it('filters expenses by area id instead of guessing the area from the text', async () => {
    const { tools, financial } = toolsForTest();

    await tools.getExpenses.execute!(
      { from: '2026-01-01', areaId: 'seed-area-pasto-4' },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(financial.listExpenses).toHaveBeenCalledWith(FARM_ID, {
      from: '2026-01-01',
      areaId: 'seed-area-pasto-4',
    });
  });

  it('has no tool input that accepts a farm id', () => {
    const schemas = [
      getFarmRegistry.inputSchema,
      updateFarmRegistry.inputSchema,
      updateFarmContextRegistry.inputSchema,
      createExpenseRegistry.inputSchema,
      createRevenueRegistry.inputSchema,
      deleteExpenseRegistry.inputSchema,
      updateExpenseRegistry.inputSchema,
      updateRevenueRegistry.inputSchema,
      getExpensesRegistry.inputSchema,
      getRevenueRegistry.inputSchema,
      getFinancialSummaryRegistry.inputSchema,
      showManualFormRegistry.inputSchema,
      getCattleOverviewRegistry.inputSchema,
      createCattleLotRegistry.inputSchema,
      moveCattleLotRegistry.inputSchema,
      openWorkspaceTableRegistry.inputSchema,
      openWorkspaceEntityRegistry.inputSchema,
      openWorkspaceChartRegistry.inputSchema,
      openWorkspaceMapRegistry.inputSchema,
    ];

    for (const schema of schemas) {
      expect(Object.keys(schema.shape)).not.toContain('farmId');
    }
    expect(
      getFarmRegistry.inputSchema.safeParse({ farmId: 'attempted-override' })
        .success,
    ).toBe(false);
  });

  it('marks expense deletion as requiring SDK approval before execution', async () => {
    const { tools, financial } = toolsForTest();

    expect(deleteExpenseRegistry.needsApproval).toBe(true);
    expect(financial.deleteExpense).not.toHaveBeenCalled();

    await tools.deleteExpense.execute!(
      { id: 'expense-duplicate' },
      TOOL_EXECUTION_OPTIONS,
    );
    expect(financial.deleteExpense).toHaveBeenCalledWith(
      FARM_ID,
      'expense-duplicate',
    );
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

describe('chat cattle tools', () => {
  it('gives the model names and ids to resolve what the producer said', async () => {
    const { tools, cattle } = toolsForTest();

    const overview = await tools.getCattleOverview.execute!(
      {},
      TOOL_EXECUTION_OPTIONS,
    );

    expect(cattle.listLots).toHaveBeenCalledWith(FARM_ID);
    expect(cattle.listPaddocks).toHaveBeenCalledWith(FARM_ID);
    expect(overview).toEqual({
      lots: [
        {
          id: 'lot-12',
          name: 'Lote 12',
          category: 'STEERS',
          headCount: 180,
          active: true,
          currentPaddock: { id: 'paddock-4', name: 'Pasto 4' },
        },
      ],
      paddocks: [
        {
          id: 'paddock-6',
          name: 'Pasto 6',
          active: true,
          plannedCapacityHead: null,
          usableAreaHa: '49.00',
          computedAreaHa: '63.00',
          hasBoundary: true,
          areaDivergence: {
            computedAreaHa: '63.00',
            usableAreaHa: '49.00',
            differencePercent: 28.6,
            significant: true,
          },
          occupiedBy: [],
        },
      ],
    });
  });

  it('executes the movement through the same command path, keyed by the approved tool call', async () => {
    const { tools, cattle } = toolsForTest();

    expect(moveCattleLotRegistry.needsApproval).toBe(true);
    expect(cattle.moveLot).not.toHaveBeenCalled();

    const result = await tools.moveCattleLot.execute!(
      {
        lotId: 'lot-12',
        fromPaddockId: 'paddock-4',
        toPaddockId: 'paddock-6',
        occurredAt: '2026-03-16T09:00:00.000Z',
        reason: 'Fim do ciclo de pastejo',
      },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(cattle.moveLot).toHaveBeenCalledWith(
      FARM_ID,
      ACTOR_ID,
      {
        lotId: 'lot-12',
        fromPaddockId: 'paddock-4',
        toPaddockId: 'paddock-6',
        occurredAt: '2026-03-16T09:00:00.000Z',
        reason: 'Fim do ciclo de pastejo',
        idempotencyKey: 'chat-test-tool-call',
        causationId: 'test-tool-call',
      },
      DomainEventSource.AGENT,
      ActorType.USER,
    );
    expect(result).toEqual({
      moved: true,
      lot: { id: 'lot-12', name: 'Lote 12', headCount: 180 },
      fromPaddock: { id: 'paddock-4', name: 'Pasto 4' },
      toPaddock: { id: 'paddock-6', name: 'Pasto 6' },
      occurredAt: '2026-03-16T09:00:00.000Z',
    });
  });

  it('creates a lot behind approval and resolves a spoken date', async () => {
    const { tools, cattle } = toolsForTest();

    expect(createCattleLotRegistry.needsApproval).toBe(true);
    expect(cattle.createLot).not.toHaveBeenCalled();

    await tools.createCattleLot.execute!(
      {
        name: 'Lote 14',
        category: 'HEIFERS',
        headCount: 72,
        startedOn: 'ontem',
      },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(cattle.createLot).toHaveBeenCalledWith(FARM_ID, {
      name: 'Lote 14',
      category: 'HEIFERS',
      headCount: 72,
      purpose: null,
      startedOn: '2026-03-15',
      notes: null,
    });
  });

  it('refuses a movement the producer did not fully state', () => {
    expect(
      moveCattleLotRegistry.inputSchema.safeParse({
        lotId: 'lot-12',
        toPaddockId: 'paddock-6',
        occurredAt: '2026-03-16T09:00:00.000Z',
      }).success,
    ).toBe(false);
    expect(
      moveCattleLotRegistry.inputSchema.safeParse({
        lotId: 'lot-12',
        fromPaddockId: 'paddock-4',
        toPaddockId: 'paddock-6',
        occurredAt: '2026-03-16T09:00:00.000Z',
        idempotencyKey: 'chosen-by-the-model',
      }).success,
    ).toBe(false);
  });
});

describe('workspace tools', () => {
  it('leaves the workspace commands for the browser to run', () => {
    const { tools } = toolsForTest();

    expect(tools.openWorkspaceTable.execute).toBeUndefined();
    expect(tools.openWorkspaceEntity.execute).toBeUndefined();
    expect(tools.openWorkspaceChart.execute).toBeUndefined();
  });

  it('accepts a command that states the whole view', () => {
    expect(
      openWorkspaceTableRegistry.inputSchema.safeParse({
        dataset: 'expenses',
        title: 'Despesas de março',
        filters: { from: '2026-03-01', to: '2026-03-31', category: 'FUEL' },
      }).success,
    ).toBe(true);
    expect(
      openWorkspaceEntityRegistry.inputSchema.safeParse({
        entityType: 'cattleLot',
        entityId: 'seed-lot-12',
      }).success,
    ).toBe(true);
  });

  it('refuses a change expressed against what is on screen', () => {
    expect(
      openWorkspaceTableRegistry.inputSchema.safeParse({
        dataset: 'expenses',
        addFilter: { category: 'FUEL' },
      }).success,
    ).toBe(false);
    expect(
      openWorkspaceTableRegistry.inputSchema.safeParse({
        filters: { category: 'FUEL' },
      }).success,
    ).toBe(false);
  });

  it('refuses a period the browser cannot resolve on its own', () => {
    expect(
      openWorkspaceTableRegistry.inputSchema.safeParse({
        dataset: 'expenses',
        filters: { from: 'semana passada' },
      }).success,
    ).toBe(false);
  });

  it('lets the model choose only the presentation of a chart', () => {
    expect(
      openWorkspaceChartRegistry.inputSchema.safeParse({
        dataset: 'expenses',
        shape: 'line',
        groupBy: 'month',
        measure: 'amount',
        title: 'Gasto mês a mês',
        filters: { from: '2026-01-01', to: '2026-03-31' },
      }).success,
    ).toBe(true);
  });

  it('lets the model frame the map on paddocks it resolved by id', () => {
    expect(
      openWorkspaceMapRegistry.inputSchema.safeParse({
        paddockIds: ['seed-area-pasto-4', 'seed-area-pasto-6'],
        title: 'Pastos do fundo',
      }).success,
    ).toBe(true);
    expect(openWorkspaceMapRegistry.inputSchema.safeParse({}).success).toBe(
      true,
    );
  });

  it('gives the model no way to draw or correct a boundary through the map', () => {
    expect(
      openWorkspaceMapRegistry.inputSchema.safeParse({
        paddockIds: ['seed-area-pasto-4'],
        boundary: {
          space: 'geo',
          points: [
            [-54.06, -19.51],
            [-54.05, -19.51],
            [-54.05, -19.52],
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      openWorkspaceMapRegistry.inputSchema.safeParse({
        paddockIds: ['seed-area-pasto-4'],
        points: [[-54.06, -19.51]],
      }).success,
    ).toBe(false);
    expect(Object.keys(openWorkspaceMapRegistry.inputSchema.shape)).toEqual([
      'paddockIds',
      'title',
    ]);
  });

  it('refuses a chart carrying its own numbers or a shape it cannot draw', () => {
    expect(
      openWorkspaceChartRegistry.inputSchema.safeParse({
        dataset: 'expenses',
        shape: 'bar',
        groupBy: 'category',
        measure: 'amount',
        series: [{ label: 'Combustível', value: '4800.00' }],
      }).success,
    ).toBe(false);
    expect(
      openWorkspaceChartRegistry.inputSchema.safeParse({
        dataset: 'expenses',
        shape: 'scatter',
        groupBy: 'category',
        measure: 'amount',
      }).success,
    ).toBe(false);
  });
});
