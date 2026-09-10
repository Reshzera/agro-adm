import { InvalidFinancialEntryError } from './errors/invalid-financial-entry.error';
import type { FinancialPeriod, MoneyInput } from './financial.types';

/** Converts a BRL decimal to centavos without ever using floating-point math. */
export function cents(value: MoneyInput, field = 'Amount'): bigint {
  const text = typeof value === 'number' ? value.toString() : value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);

  if (!match) {
    throw new InvalidFinancialEntryError(
      `${field} must be a non-negative monetary value with at most two decimal places.`,
    );
  }

  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

export function positiveCents(value: MoneyInput, field = 'Amount'): bigint {
  const result = cents(value, field);
  if (result <= 0n) {
    throw new InvalidFinancialEntryError(`${field} must be greater than zero.`);
  }
  return result;
}

export function money(centsValue: bigint): string {
  const negative = centsValue < 0n;
  const absolute = negative ? -centsValue : centsValue;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function decimalToCents(value: { toString(): string }): bigint {
  return cents(value.toString());
}

export function dateOnly(value: string | Date, field = 'Date'): Date {
  if (typeof value === 'string') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) {
      throw new InvalidFinancialEntryError(
        `${field} must be a valid YYYY-MM-DD date.`,
      );
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      date.getUTCFullYear() !== Number(parts[1]) ||
      date.getUTCMonth() + 1 !== Number(parts[2]) ||
      date.getUTCDate() !== Number(parts[3])
    ) {
      throw new InvalidFinancialEntryError(
        `${field} must be a valid YYYY-MM-DD date.`,
      );
    }
    return date;
  }

  const date = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
  if (Number.isNaN(date.getTime())) {
    throw new InvalidFinancialEntryError(
      `${field} must be a valid YYYY-MM-DD date.`,
    );
  }
  return date;
}

export function optionalPeriod(period: FinancialPeriod): {
  from?: Date;
  to?: Date;
} {
  const from = period.from ? dateOnly(period.from, 'From') : undefined;
  const to = period.to ? dateOnly(period.to, 'To') : undefined;
  if (from && to && from > to) {
    throw new InvalidFinancialEntryError('From must be on or before to.');
  }
  return { from, to };
}
