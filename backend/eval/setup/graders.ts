import { resolveDate } from '../../src/modules/chat/tools/utils';
import { cents } from '../../src/modules/financial/financial.utils';
import { SEED_CLOCK } from '../../src/seed/santa-clara';
import type { Grader, RecordedCall } from './case';

type Input = Record<string, any>;
export type Check = (input: Input) => string | null;
export type Expectation = { tool: string; check?: Check };

function show(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function describe(calls: RecordedCall[]): string {
  if (calls.length === 0) return 'nenhuma tool';
  return calls
    .map((call) => `${call.toolName}(${show(call.input)})`)
    .join(', ');
}

function toCents(value: unknown): bigint | null {
  try {
    return cents(typeof value === 'number' ? value : String(value));
  } catch {
    return null;
  }
}

function toIso(value: unknown): string | null {
  try {
    return resolveDate(String(value), SEED_CLOCK);
  } catch {
    return null;
  }
}

const READ_ONLY_TOOLS = [
  'getFarm',
  'getExpenses',
  'getRevenue',
  'getFinancialSummary',
  'showManualForm',
];

export function noWrite(): Grader {
  return (calls) => {
    const writes = calls.filter(
      (call) => !READ_ONLY_TOOLS.includes(call.toolName),
    );
    return writes.length === 0
      ? { ok: true, detail: `não gravou nada — ${describe(calls)}` }
      : {
          ok: false,
          detail: `gravou sem ter o suficiente: ${describe(writes)}`,
        };
  };
}

export function anyOf(...expectations: Expectation[]): Grader {
  return (calls) => {
    const reasons: string[] = [];

    for (const expectation of expectations) {
      const matching = calls.filter(
        (call) => call.toolName === expectation.tool,
      );
      if (matching.length === 0) {
        reasons.push(`não chamou ${expectation.tool}`);
        continue;
      }
      const failures = matching.map(
        (call) => expectation.check?.(call.input) ?? null,
      );
      if (failures.includes(null)) {
        return { ok: true, detail: describe(matching) };
      }
      reasons.push(`${expectation.tool}: ${failures.join(' / ')}`);
    }

    return {
      ok: false,
      detail: `${reasons.join('; ')} — veio ${describe(calls)}`,
    };
  };
}

export function calls(tool: string, ...checks: Check[]): Grader {
  return anyOf({ tool, check: all(...checks) });
}

export function all(...checks: Check[]): Check {
  return (input) => {
    const failures = checks
      .map((check) => check(input))
      .filter((failure): failure is string => failure !== null);
    return failures.length === 0 ? null : failures.join(' e ');
  };
}

export function money(field: string, expected: string): Check {
  return (input) => {
    const actual = toCents(input[field]);
    return actual !== null && actual === cents(expected)
      ? null
      : `${field}=${show(input[field])} ≠ ${expected}`;
  };
}

export function date(field: string, expected: string): Check {
  return (input) => {
    const actual = toIso(input[field]);
    return actual === expected
      ? null
      : `${field}=${show(input[field])} resolve para ${actual ?? 'nada'} ≠ ${expected}`;
  };
}

export function equals(field: string, expected: unknown): Check {
  return (input) =>
    input[field] === expected
      ? null
      : `${field}=${show(input[field])} ≠ ${show(expected)}`;
}

export function matches(field: string, expected: RegExp): Check {
  return (input) =>
    typeof input[field] === 'string' && expected.test(input[field])
      ? null
      : `${field}=${show(input[field])} não casa com ${expected.source}`;
}

export function month(value: string): Check {
  return (input) => {
    const from = toIso(input.from);
    if (from !== `${value}-01`) {
      return `from=${show(input.from)} não abre ${value}`;
    }
    if (input.to === undefined || input.to === null) return null;
    const to = toIso(input.to);
    return to?.startsWith(value)
      ? null
      : `to=${show(input.to)} sai de ${value}`;
  };
}

export function spans(firstIso: string, lastIso: string): Check {
  return (input) => {
    for (const [field, limit, breaks] of [
      ['from', firstIso, (value: string) => value > firstIso],
      ['to', lastIso, (value: string) => value < lastIso],
    ] as const) {
      if (input[field] === undefined || input[field] === null) continue;
      const actual = toIso(input[field]);
      if (actual === null || breaks(actual)) {
        return `${field}=${show(input[field])} não alcança ${limit}`;
      }
    }
    return null;
  };
}

export function allocations(
  expected: Array<{ areaId: string | null; amount: string }>,
): Check {
  return (input) => {
    const actual = input.allocations as
      Array<{ areaId?: unknown; amount?: unknown }> | undefined;
    if (!Array.isArray(actual)) return `allocations ausente`;
    if (actual.length !== expected.length) {
      return `allocations tem ${actual.length} item(ns), esperado ${expected.length}`;
    }
    const pending = [...expected];
    for (const item of actual) {
      const index = pending.findIndex(
        (candidate) =>
          (candidate.areaId ?? null) === (item.areaId ?? null) &&
          toCents(item.amount) === cents(candidate.amount),
      );
      if (index === -1) return `allocation ${show(item)} não esperada`;
      pending.splice(index, 1);
    }
    return null;
  };
}

export function wholeFarm(): Check {
  return (input) => {
    const actual = input.allocations as
      Array<{ areaId?: unknown }> | undefined | null;
    if (actual === undefined || actual === null) return null;
    return actual.every((item) => (item.areaId ?? null) === null)
      ? null
      : `esperava despesa sem área, veio ${show(actual)}`;
  };
}
