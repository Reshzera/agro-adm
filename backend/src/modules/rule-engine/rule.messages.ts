import type { Prisma } from '@prisma/client';
import type { RulePreview, ThresholdSource } from './rule.types';

export type RuleSubject = {
  lotName: string;
  paddockName: string;
};

const THRESHOLD_SOURCES: Record<ThresholdSource, string> = {
  PADDOCK: 'limite do próprio pasto',
  FARM: 'padrão da fazenda',
  UNCONFIGURED: 'sem limite configurado',
};

function fact(facts: Prisma.InputJsonObject, key: string): number | null {
  const value = facts[key];
  return typeof value === 'number' ? value : null;
}

function threshold(configSnapshot: Prisma.InputJsonObject): {
  value: number | null;
  source: string;
} {
  const raw = configSnapshot.threshold;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { value: null, source: THRESHOLD_SOURCES.UNCONFIGURED };
  }
  const record = raw as Prisma.InputJsonObject;
  const value = fact(record, 'value');
  const source = record.source;
  return {
    value,
    source:
      typeof source === 'string' && source in THRESHOLD_SOURCES
        ? THRESHOLD_SOURCES[source as ThresholdSource]
        : THRESHOLD_SOURCES.UNCONFIGURED,
  };
}

function count(value: number | null): string {
  return value === null
    ? 'sem valor'
    : Math.round(value).toLocaleString('pt-BR');
}

const MESSAGES: Record<
  string,
  (evaluation: RulePreview, subject: RuleSubject) => string
> = {
  'paddock.stocking_level': (evaluation, subject) => {
    const limit = threshold(evaluation.configSnapshot);
    return `${subject.paddockName} fica com ${count(fact(evaluation.facts, 'currentHeadCount'))} cabeças, acima da lotação de ${count(limit.value)} (${limit.source}).`;
  },
  'paddock.rest_period': (evaluation, subject) => {
    const limit = threshold(evaluation.configSnapshot);
    return `${subject.paddockName} terá descansado ${count(fact(evaluation.facts, 'restDays'))} dias, menos que os ${count(limit.value)} dias de descanso mínimo (${limit.source}).`;
  },
  'rotation.grazing_review_due': (evaluation, subject) => {
    const limit = threshold(evaluation.configSnapshot);
    return `${subject.lotName} chega a ${count(fact(evaluation.facts, 'grazingDays'))} dias de pastejo, no limite de ${count(limit.value)} dias (${limit.source}).`;
  },
};

export function describeRule(
  evaluation: RulePreview,
  subject: RuleSubject,
): string {
  const message = MESSAGES[evaluation.ruleId];
  return message
    ? message(evaluation, subject)
    : `${subject.lotName}: ${evaluation.ruleId} exige atenção.`;
}
