import type { ThresholdSource } from './rule.types';

export type ResolvedThreshold = {
  value: number | null;
  unit: string | null;
  source: ThresholdSource;
};

const THRESHOLD_SOURCES: readonly ThresholdSource[] = [
  'PADDOCK',
  'FARM',
  'UNCONFIGURED',
];

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function numericFact(facts: unknown, key: string): number | null {
  const record = asObject(facts);
  const value = record?.[key];
  return typeof value === 'number' ? value : null;
}

export function readThreshold(configSnapshot: unknown): ResolvedThreshold {
  const threshold = asObject(asObject(configSnapshot)?.threshold);
  if (!threshold) return { value: null, unit: null, source: 'UNCONFIGURED' };

  const source = threshold.source;
  return {
    value: typeof threshold.value === 'number' ? threshold.value : null,
    unit: typeof threshold.unit === 'string' ? threshold.unit : null,
    source: THRESHOLD_SOURCES.includes(source as ThresholdSource)
      ? (source as ThresholdSource)
      : 'UNCONFIGURED',
  };
}
