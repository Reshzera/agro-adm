import { EntrySource, ExpenseCategory } from '@prisma/client';
import type { FarmAgentContext } from '../../src/modules/chat/chat.repository';
import { FarmRepository } from '../../src/modules/farm/farm.repository';
import { FarmService } from '../../src/modules/farm/farm.service';
import { FinancialRepository } from '../../src/modules/financial/financial.repository';
import { FinancialService } from '../../src/modules/financial/financial.service';
import { SEED_IDS } from '../../src/seed/santa-clara';

type Allocation = {
  amount: string;
  areaId: string | null;
  area: { name: string } | null;
};

type Expense = {
  id: string;
  amount: string;
  date: Date;
  description: string;
  category: ExpenseCategory;
  source: EntrySource;
  allocations: Allocation[];
};

type Revenue = {
  id: string;
  amount: string;
  date: Date;
  description: string;
  source: EntrySource;
};

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function general(amount: string): Allocation[] {
  return [{ amount, areaId: null, area: null }];
}

function inArea(areaId: string, name: string, amount: string): Allocation[] {
  return [{ amount, areaId, area: { name } }];
}

export const EXPENSES: Expense[] = [
  {
    id: SEED_IDS.expenses.diesel,
    amount: '4800.00',
    date: day('2026-03-10'),
    description: 'Diesel do trator',
    category: ExpenseCategory.FUEL,
    source: EntrySource.WEB_AGENT,
    allocations: general('4800.00'),
  },
  {
    id: SEED_IDS.expenses.reformaPasto4,
    amount: '18000.00',
    date: day('2026-03-04'),
    description: 'Reforma do pasto 4',
    category: ExpenseCategory.PASTURE_AND_CROP_WORK,
    source: EntrySource.WEB_AGENT,
    allocations: inArea(SEED_IDS.areas.pasto4, 'Pasto 4', '18000.00'),
  },
  {
    id: SEED_IDS.expenses.aduboRateado,
    amount: '24000.00',
    date: day('2026-03-02'),
    description: 'Adubo para o milho, metade em cada talhão',
    category: ExpenseCategory.FERTILIZER_AND_SEED,
    source: EntrySource.MANUAL,
    allocations: [
      ...inArea(SEED_IDS.areas.talhao1, 'Talhão 1', '12000.00'),
      ...inArea(SEED_IDS.areas.talhao2, 'Talhão 2', '12000.00'),
    ],
  },
  {
    id: SEED_IDS.expenses.salarios,
    amount: '9200.00',
    date: day('2026-02-28'),
    description: 'Salários dos dois funcionários',
    category: ExpenseCategory.LABOR,
    source: EntrySource.MANUAL,
    allocations: general('9200.00'),
  },
  {
    id: SEED_IDS.expenses.vacina,
    amount: '3150.00',
    date: day('2026-02-01'),
    description: 'Vacina de aftosa do rebanho',
    category: ExpenseCategory.ANIMAL_HEALTH,
    source: EntrySource.WHATSAPP_TEXT,
    allocations: inArea(SEED_IDS.areas.pasto4, 'Pasto 4', '3150.00'),
  },
];

export const REVENUES: Revenue[] = [
  {
    id: SEED_IDS.revenues.boiGordo,
    amount: '86400.00',
    date: day('2026-03-06'),
    description: 'Venda de 24 bois gordos para o frigorífico',
    source: EntrySource.WEB_AGENT,
  },
  {
    id: SEED_IDS.revenues.milho,
    amount: '31500.00',
    date: day('2026-03-12'),
    description: 'Venda de milho, 450 sacas',
    source: EntrySource.MANUAL,
  },
  {
    id: SEED_IDS.revenues.bezerros,
    amount: '42000.00',
    date: day('2026-02-14'),
    description: 'Venda de bezerros desmamados',
    source: EntrySource.MANUAL,
  },
];

function within(date: Date, from?: Date, to?: Date): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function byDateDesc<T extends { date: Date }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => +right.date - +left.date);
}

export function evalFinancialService(): FinancialService {
  const repository = {
    listExpenses(
      _farmId: string,
      filters: {
        from?: Date;
        to?: Date;
        category?: ExpenseCategory;
        term?: string;
        areaId?: string;
      },
    ) {
      const term = filters.term?.toLocaleLowerCase('pt-BR');
      return Promise.resolve(
        byDateDesc(
          EXPENSES.filter(
            (expense) =>
              within(expense.date, filters.from, filters.to) &&
              (!filters.category || expense.category === filters.category) &&
              (!filters.areaId ||
                expense.allocations.some(
                  (allocation) => allocation.areaId === filters.areaId,
                )) &&
              (!term ||
                expense.description.toLocaleLowerCase('pt-BR').includes(term)),
          ),
        ),
      );
    },
    listExpenseAllocations(_farmId: string, from?: Date, to?: Date) {
      return Promise.resolve(
        EXPENSES.filter((expense) => within(expense.date, from, to)).flatMap(
          (expense) =>
            expense.allocations.map((allocation) => ({
              amount: allocation.amount,
              expense: { category: expense.category },
            })),
        ),
      );
    },
    listRevenues(_farmId: string, from?: Date, to?: Date) {
      return Promise.resolve(
        byDateDesc(
          REVENUES.filter((revenue) => within(revenue.date, from, to)),
        ),
      );
    },
  };

  return new FinancialService(repository as unknown as FinancialRepository);
}

export function evalFarmService(farm: FarmAgentContext): FarmService {
  const repository = {
    findForAgent(id: string) {
      return Promise.resolve({
        id,
        name: farm.name,
        totalAreaHa: farm.totalAreaHa,
        primaryActivity: farm.primaryActivity,
        location: farm.location,
        mainCrops: farm.mainCrops,
        approximateAnimalCount: farm.approximateAnimalCount,
        agentContext: farm.agentContext,
        onboardingCompleted: farm.onboardingCompleted,
      });
    },
  };

  return new FarmService(repository as unknown as FarmRepository);
}
