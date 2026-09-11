import { jest } from '@jest/globals';
import { EntrySource, ExpenseCategory } from '@prisma/client';
import { FinancialService } from '../../src/modules/financial/financial.service';

type ExpenseAllocationSummary = {
  amount: { toString(): string };
  expense: { category: ExpenseCategory };
};

type RevenueSummary = { amount: { toString(): string } };

type ExpenseListFilters = {
  from?: Date;
  to?: Date;
  category?: ExpenseCategory;
  term?: string;
  areaId?: string;
};

describe('FinancialService', () => {
  const repository = {
    areasBelongToFarm:
      jest.fn<(farmId: string, areaIds: string[]) => Promise<boolean>>(),
    createExpense: jest.fn(),
    findExpense: jest.fn(),
    updateExpense: jest.fn(),
    deleteExpense: jest.fn(),
    listExpenses:
      jest.fn<
        (farmId: string, filters: ExpenseListFilters) => Promise<unknown[]>
      >(),
    listExpenseAllocations:
      jest.fn<
        (
          farmId: string,
          from?: Date,
          to?: Date,
        ) => Promise<ExpenseAllocationSummary[]>
      >(),
    createRevenue: jest.fn(),
    findRevenue: jest.fn(),
    updateRevenue: jest.fn(),
    deleteRevenue: jest.fn(),
    listRevenues:
      jest.fn<
        (farmId: string, from?: Date, to?: Date) => Promise<RevenueSummary[]>
      >(),
  };
  const service = new FinancialService(repository as never);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.areasBelongToFarm.mockResolvedValue(true);
    repository.createExpense.mockImplementation((input) =>
      Promise.resolve(input),
    );
    repository.listExpenses.mockResolvedValue([]);
    repository.listRevenues.mockResolvedValue([]);
  });

  const expense = {
    amount: '100.00',
    date: '2026-03-10',
    description: 'Diesel do trator',
    category: ExpenseCategory.FUEL,
    source: EntrySource.MANUAL,
  };

  it('creates a farm-wide allocation when none is supplied', async () => {
    const result = await service.createExpense('farm-1', expense);

    expect(result.allocations).toEqual([{ areaId: null, amount: '100.00' }]);
  });

  it('accepts a 50/50 split only when its exact centavo sum closes', async () => {
    const result = await service.createExpense('farm-1', {
      ...expense,
      allocations: [
        { areaId: 'area-1', amount: '50.00' },
        { areaId: 'area-2', amount: '50.00' },
      ],
    });

    expect(result.allocations).toEqual([
      { areaId: 'area-1', amount: '50.00' },
      { areaId: 'area-2', amount: '50.00' },
    ]);
  });

  it('rejects an allocation set whose sum differs from the expense', async () => {
    await expect(
      service.createExpense('farm-1', {
        ...expense,
        allocations: [{ areaId: 'area-1', amount: '99.99' }],
      }),
    ).rejects.toThrow('Allocation amounts must equal the expense amount.');
  });

  it('derives expenses by category from allocations', async () => {
    repository.listExpenseAllocations.mockResolvedValue([
      {
        amount: { toString: () => '40.00' },
        expense: { category: ExpenseCategory.FUEL },
      },
      {
        amount: { toString: () => '60.00' },
        expense: { category: ExpenseCategory.FUEL },
      },
    ]);
    repository.listRevenues.mockResolvedValue([
      { amount: { toString: () => '150.00' } },
    ]);

    await expect(
      service.getFinancialSummary('farm-1', {
        from: '2026-03-01',
        to: '2026-03-31',
      }),
    ).resolves.toEqual({
      totalExpenses: '100.00',
      totalRevenues: '150.00',
      result: '50.00',
      expensesByCategory: [
        { category: ExpenseCategory.FUEL, amount: '100.00' },
      ],
    });
  });

  it('does not mix uncategorized revenues into a category filter', async () => {
    await service.listFinancialEntries('farm-1', {
      category: ExpenseCategory.FUEL,
    });

    expect(repository.listExpenses).toHaveBeenCalledWith('farm-1', {
      category: ExpenseCategory.FUEL,
    });
    expect(repository.listRevenues).not.toHaveBeenCalled();
  });

  it('narrows expenses to an area alongside the period', async () => {
    await service.listExpenses('farm-1', {
      from: '2026-01-01',
      areaId: 'seed-area-pasto-4',
    });

    expect(repository.listExpenses).toHaveBeenCalledWith('farm-1', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      areaId: 'seed-area-pasto-4',
    });
  });
});
