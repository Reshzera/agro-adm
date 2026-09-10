import { ExpenseCategory } from '@prisma/client';
import { z } from 'zod';
import { dateOnly } from '../../financial/financial.utils';

export const moneySchema = z
  .string()
  .regex(
    /^\d+(?:\.\d{1,2})?$/,
    'Use a monetary value with at most two decimal places.',
  );
export const relativeDateSchema = z.string().min(1);
export const categorySchema = z.enum(ExpenseCategory);
export const periodSchema = z
  .object({
    from: relativeDateSchema.optional(),
    to: relativeDateSchema.optional(),
  })
  .strict();

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveDate(value: string, now: Date): string {
  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  const today = dateOnly(now);
  const offset = (days: number) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + days);
    return isoDate(date);
  };
  if (normalized === 'hoje' || normalized === 'today') return isoDate(today);
  if (normalized === 'ontem' || normalized === 'yesterday') return offset(-1);
  if (['amanhã', 'amanha', 'tomorrow'].includes(normalized)) return offset(1);
  if (['semana passada', 'last week'].includes(normalized)) return offset(-7);
  return isoDate(dateOnly(value));
}

export function resolvePeriod(period: z.infer<typeof periodSchema>, now: Date) {
  return {
    ...(period.from ? { from: resolveDate(period.from, now) } : {}),
    ...(period.to ? { to: resolveDate(period.to, now) } : {}),
  };
}

type DecimalLike = {
  toFixed: (digits?: number) => string;
  toString(): string;
};

function isDecimalLike(value: object): value is DecimalLike {
  return (
    'toFixed' in value &&
    typeof (value as { toFixed?: unknown }).toFixed === 'function' &&
    'toString' in value &&
    typeof (value as { toString?: unknown }).toString === 'function'
  );
}

export function serialize(value: unknown): unknown {
  if (value instanceof Date) return isoDate(value);
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    if (isDecimalLike(value)) return value.toString();
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serialize(item),
      ]),
    );
  }
  return value;
}
