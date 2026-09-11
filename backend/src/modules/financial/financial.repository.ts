import { Injectable } from '@nestjs/common';
import {
  type EntrySource,
  type ExpenseCategory,
  type Prisma,
} from '@prisma/client';
import { DatabaseService } from '../database/database.service';

type PeriodWhere = { gte?: Date; lt?: Date };

function periodWhere(from?: Date, to?: Date): PeriodWhere | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lt: new Date(to.getTime() + 86_400_000) } : {}),
  };
}

@Injectable()
export class FinancialRepository {
  constructor(private readonly db: DatabaseService) {}

  listAreas(farmId: string) {
    return this.db.client.farmArea.findMany({
      where: { farmId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async areasBelongToFarm(farmId: string, areaIds: string[]): Promise<boolean> {
    if (!areaIds.length) return true;
    const count = await this.db.client.farmArea.count({
      where: { farmId, id: { in: areaIds } },
    });
    return count === areaIds.length;
  }

  createExpense(data: {
    farmId: string;
    amount: string;
    date: Date;
    description: string;
    category: ExpenseCategory;
    source: EntrySource;
    allocations: { areaId: string | null; amount: string }[];
  }) {
    return this.db.client.expense.create({
      data: {
        ...data,
        allocations: { create: data.allocations },
      },
      include: {
        allocations: { include: { area: { select: { name: true } } } },
      },
    });
  }

  findExpense(farmId: string, id: string) {
    return this.db.client.expense.findFirst({
      where: { id, farmId },
      include: { allocations: true },
    });
  }

  updateExpense(
    farmId: string,
    id: string,
    data: Prisma.ExpenseUpdateInput,
    allocations?: { areaId: string | null; amount: string }[],
  ) {
    return this.db.transaction(async () => {
      const existing = await this.db.client.expense.findFirst({
        where: { id, farmId },
      });
      if (!existing) return null;

      if (allocations) {
        await this.db.client.expenseAllocation.deleteMany({
          where: { expenseId: id },
        });
        data.allocations = { create: allocations };
      }

      return this.db.client.expense.update({
        where: { id },
        data,
        include: {
          allocations: { include: { area: { select: { name: true } } } },
        },
      });
    });
  }

  deleteExpense(farmId: string, id: string) {
    return this.db.client.expense.deleteMany({ where: { id, farmId } });
  }

  listExpenses(
    farmId: string,
    filters: {
      from?: Date;
      to?: Date;
      category?: ExpenseCategory;
      term?: string;
      areaId?: string;
    },
  ) {
    return this.db.client.expense.findMany({
      where: {
        farmId,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.areaId
          ? { allocations: { some: { areaId: filters.areaId } } }
          : {}),
        ...(filters.term
          ? { description: { contains: filters.term, mode: 'insensitive' } }
          : {}),
        ...(periodWhere(filters.from, filters.to)
          ? { date: periodWhere(filters.from, filters.to) }
          : {}),
      },
      include: {
        allocations: { include: { area: { select: { name: true } } } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  listExpenseAllocations(farmId: string, from?: Date, to?: Date) {
    return this.db.client.expenseAllocation.findMany({
      where: {
        expense: {
          farmId,
          ...(periodWhere(from, to) ? { date: periodWhere(from, to) } : {}),
        },
      },
      select: {
        amount: true,
        expense: { select: { category: true } },
      },
    });
  }

  createRevenue(data: {
    farmId: string;
    amount: string;
    date: Date;
    description: string;
    source: EntrySource;
  }) {
    return this.db.client.revenue.create({ data });
  }

  findRevenue(farmId: string, id: string) {
    return this.db.client.revenue.findFirst({ where: { id, farmId } });
  }

  updateRevenue(farmId: string, id: string, data: Prisma.RevenueUpdateInput) {
    return this.db.client.revenue.updateMany({ where: { id, farmId }, data });
  }

  deleteRevenue(farmId: string, id: string) {
    return this.db.client.revenue.deleteMany({ where: { id, farmId } });
  }

  listRevenues(farmId: string, from?: Date, to?: Date) {
    return this.db.client.revenue.findMany({
      where: {
        farmId,
        ...(periodWhere(from, to) ? { date: periodWhere(from, to) } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
