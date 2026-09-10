import { Injectable } from '@nestjs/common';
import { type ExpenseCategory, type Prisma } from '@prisma/client';
import { FinancialEntryNotFoundError } from './errors/financial-entry-not-found.error';
import { InvalidFinancialEntryError } from './errors/invalid-financial-entry.error';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { ExpenseAllocationDto } from './dto/expense-allocation.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import {
  type FinancialEntryListFilters,
  type ExpenseListFilters,
  type FinancialPeriod,
} from './financial.types';
import { FinancialRepository } from './financial.repository';
import {
  dateOnly,
  decimalToCents,
  money,
  optionalPeriod,
  positiveCents,
} from './financial.utils';

@Injectable()
export class FinancialService {
  constructor(private readonly repository: FinancialRepository) {}

  async createExpense(farmId: string, input: CreateExpenseDto) {
    const amount = positiveCents(input.amount);
    const allocations = await this.allocationsForFarm(
      farmId,
      input.allocations,
      amount,
    );
    return this.repository.createExpense({
      farmId,
      amount: money(amount),
      date: dateOnly(input.date),
      description: this.description(input.description),
      category: input.category,
      source: input.source,
      allocations,
    });
  }

  async updateExpense(farmId: string, input: UpdateExpenseDto) {
    const current = await this.repository.findExpense(farmId, input.id);
    if (!current) throw new FinancialEntryNotFoundError();

    const changingAmount = input.amount !== undefined;
    if (changingAmount && input.allocations === undefined) {
      throw new InvalidFinancialEntryError(
        'Allocations must replace the full set when changing an expense amount.',
      );
    }

    const amount = changingAmount
      ? positiveCents(input.amount!)
      : decimalToCents(current.amount);
    const allocations =
      input.allocations === undefined
        ? undefined
        : await this.allocationsForFarm(farmId, input.allocations, amount);
    const data: Prisma.ExpenseUpdateInput = {
      ...(changingAmount ? { amount: money(amount) } : {}),
      ...(input.date ? { date: dateOnly(input.date) } : {}),
      ...(input.description !== undefined
        ? { description: this.description(input.description) }
        : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.source ? { source: input.source } : {}),
    };
    const updated = await this.repository.updateExpense(
      farmId,
      input.id,
      data,
      allocations,
    );
    if (!updated) throw new FinancialEntryNotFoundError();
    return updated;
  }

  async deleteExpense(farmId: string, id: string): Promise<void> {
    const result = await this.repository.deleteExpense(farmId, id);
    if (!result.count) throw new FinancialEntryNotFoundError();
  }

  listExpenses(farmId: string, filters: ExpenseListFilters = {}) {
    return this.repository.listExpenses(farmId, {
      ...optionalPeriod(filters),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.term?.trim() ? { term: filters.term.trim() } : {}),
    });
  }

  async createRevenue(farmId: string, input: CreateRevenueDto) {
    const amount = positiveCents(input.amount);
    return this.repository.createRevenue({
      farmId,
      amount: money(amount),
      date: dateOnly(input.date),
      description: this.description(input.description),
      source: input.source,
    });
  }

  async updateRevenue(farmId: string, input: UpdateRevenueDto) {
    const current = await this.repository.findRevenue(farmId, input.id);
    if (!current) throw new FinancialEntryNotFoundError();
    const data: Prisma.RevenueUpdateInput = {
      ...(input.amount !== undefined
        ? { amount: money(positiveCents(input.amount)) }
        : {}),
      ...(input.date ? { date: dateOnly(input.date) } : {}),
      ...(input.description !== undefined
        ? { description: this.description(input.description) }
        : {}),
      ...(input.source ? { source: input.source } : {}),
    };
    const result = await this.repository.updateRevenue(farmId, input.id, data);
    if (!result.count) throw new FinancialEntryNotFoundError();
    return this.repository.findRevenue(farmId, input.id);
  }

  async deleteRevenue(farmId: string, id: string): Promise<void> {
    const result = await this.repository.deleteRevenue(farmId, id);
    if (!result.count) throw new FinancialEntryNotFoundError();
  }

  listRevenues(farmId: string, period: FinancialPeriod = {}) {
    const { from, to } = optionalPeriod(period);
    return this.repository.listRevenues(farmId, from, to);
  }

  async listFinancialEntries(
    farmId: string,
    filters: FinancialEntryListFilters = {},
  ) {
    const expenses =
      filters.type === 'REVENUE'
        ? []
        : await this.listExpenses(farmId, filters);
    const revenues =
      filters.type === 'EXPENSE'
        ? []
        : await this.listRevenues(farmId, filters);

    return [
      ...expenses.map((expense) => ({ type: 'EXPENSE' as const, ...expense })),
      ...revenues.map((revenue) => ({ type: 'REVENUE' as const, ...revenue })),
    ].sort((left, right) => right.date.getTime() - left.date.getTime());
  }

  async getExpensesByCategory(farmId: string, period: FinancialPeriod = {}) {
    const { from, to } = optionalPeriod(period);
    const allocations = await this.repository.listExpenseAllocations(
      farmId,
      from,
      to,
    );
    return this.categoryTotals(allocations);
  }

  async getFinancialSummary(farmId: string, period: FinancialPeriod = {}) {
    const { from, to } = optionalPeriod(period);
    const [allocations, revenues] = await Promise.all([
      this.repository.listExpenseAllocations(farmId, from, to),
      this.repository.listRevenues(farmId, from, to),
    ]);
    let totalExpenses = 0n;
    let totalRevenues = 0n;
    const expensesByCategory = new Map<ExpenseCategory, bigint>();

    for (const allocation of allocations) {
      const amount = decimalToCents(allocation.amount);
      totalExpenses += amount;
      expensesByCategory.set(
        allocation.expense.category,
        (expensesByCategory.get(allocation.expense.category) ?? 0n) + amount,
      );
    }
    for (const revenue of revenues)
      totalRevenues += decimalToCents(revenue.amount);

    return {
      totalExpenses: money(totalExpenses),
      totalRevenues: money(totalRevenues),
      result: money(totalRevenues - totalExpenses),
      expensesByCategory: [...expensesByCategory.entries()].map(
        ([category, amount]) => ({
          category,
          amount: money(amount),
        }),
      ),
    };
  }

  private async allocationsForFarm(
    farmId: string,
    input: ExpenseAllocationDto[] | undefined,
    amount: bigint,
  ): Promise<{ areaId: string | null; amount: string }[]> {
    const allocations = input ?? [{ areaId: null, amount: money(amount) }];
    if (!allocations.length) {
      throw new InvalidFinancialEntryError(
        'An expense needs at least one allocation.',
      );
    }

    const seenAreas = new Set<string>();
    let allocated = 0n;
    const normalized = allocations.map((allocation) => {
      const key = allocation.areaId ?? '__farm__';
      if (seenAreas.has(key)) {
        throw new InvalidFinancialEntryError(
          'An area can only appear once in an allocation.',
        );
      }
      seenAreas.add(key);
      const allocationAmount = positiveCents(
        allocation.amount,
        'Allocation amount',
      );
      allocated += allocationAmount;
      return { areaId: allocation.areaId, amount: money(allocationAmount) };
    });

    if (allocated !== amount) {
      throw new InvalidFinancialEntryError(
        'Allocation amounts must equal the expense amount.',
      );
    }
    const areaIds = normalized.flatMap(({ areaId }) =>
      areaId ? [areaId] : [],
    );
    if (!(await this.repository.areasBelongToFarm(farmId, areaIds))) {
      throw new InvalidFinancialEntryError(
        'Every allocation area must belong to the farm.',
      );
    }
    return normalized;
  }

  private description(value: string): string {
    const description = value.trim();
    if (!description) {
      throw new InvalidFinancialEntryError('Description must not be empty.');
    }
    return description;
  }

  private categoryTotals(
    allocations: {
      amount: { toString(): string };
      expense: { category: ExpenseCategory };
    }[],
  ) {
    const totals = new Map<ExpenseCategory, bigint>();
    for (const allocation of allocations) {
      const amount = decimalToCents(allocation.amount);
      totals.set(
        allocation.expense.category,
        (totals.get(allocation.expense.category) ?? 0n) + amount,
      );
    }
    return [...totals.entries()].map(([category, amount]) => ({
      category,
      amount: money(amount),
    }));
  }
}
