import { Injectable } from '@nestjs/common';
import {
  type EntrySource,
  type ExpenseCategory,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async areasBelongToFarm(farmId: string, areaIds: string[]): Promise<boolean> {
    if (!areaIds.length) return true;
    const count = await this.prisma.farmArea.count({
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
    return this.prisma.expense.create({
      data: {
        ...data,
        allocations: { create: data.allocations },
      },
      include: { allocations: true },
    });
  }

  findExpense(farmId: string, id: string) {
    return this.prisma.expense.findFirst({
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
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({ where: { id, farmId } });
      if (!existing) return null;

      if (allocations) {
        await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
        data.allocations = { create: allocations };
      }

      return tx.expense.update({
        where: { id },
        data,
        include: { allocations: true },
      });
    });
  }

  deleteExpense(farmId: string, id: string) {
    return this.prisma.expense.deleteMany({ where: { id, farmId } });
  }

  listExpenses(
    farmId: string,
    filters: {
      from?: Date;
      to?: Date;
      category?: ExpenseCategory;
      term?: string;
    },
  ) {
    return this.prisma.expense.findMany({
      where: {
        farmId,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.term
          ? { description: { contains: filters.term, mode: 'insensitive' } }
          : {}),
        ...(periodWhere(filters.from, filters.to)
          ? { date: periodWhere(filters.from, filters.to) }
          : {}),
      },
      include: { allocations: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  listExpenseAllocations(farmId: string, from?: Date, to?: Date) {
    return this.prisma.expenseAllocation.findMany({
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
    return this.prisma.revenue.create({ data });
  }

  findRevenue(farmId: string, id: string) {
    return this.prisma.revenue.findFirst({ where: { id, farmId } });
  }

  updateRevenue(farmId: string, id: string, data: Prisma.RevenueUpdateInput) {
    return this.prisma.revenue.updateMany({ where: { id, farmId }, data });
  }

  deleteRevenue(farmId: string, id: string) {
    return this.prisma.revenue.deleteMany({ where: { id, farmId } });
  }

  listRevenues(farmId: string, from?: Date, to?: Date) {
    return this.prisma.revenue.findMany({
      where: {
        farmId,
        ...(periodWhere(from, to) ? { date: periodWhere(from, to) } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
