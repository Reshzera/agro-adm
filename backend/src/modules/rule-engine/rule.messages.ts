import type { RulePreview, ThresholdSource } from './rule.types';
import { numericFact, readThreshold } from './rule.threshold';

export type RuleSubject = {
  lotName: string;
  paddockName: string;
};

export const THRESHOLD_SOURCE_LABELS: Record<ThresholdSource, string> = {
  PADDOCK: 'limite do próprio pasto',
  FARM: 'padrão da fazenda',
  UNCONFIGURED: 'sem limite configurado',
};

export function count(value: number | null): string {
  return value === null
    ? 'sem valor'
    : Math.round(value).toLocaleString('pt-BR');
}

const MESSAGES: Record<
  string,
  (evaluation: RulePreview, subject: RuleSubject) => string
> = {
  'paddock.stocking_level': (evaluation, subject) => {
    const limit = readThreshold(evaluation.configSnapshot);
    return `${subject.paddockName} fica com ${count(numericFact(evaluation.facts, 'currentHeadCount'))} cabeças, acima da lotação de ${count(limit.value)} (${THRESHOLD_SOURCE_LABELS[limit.source]}).`;
  },
  'paddock.rest_period': (evaluation, subject) => {
    const limit = readThreshold(evaluation.configSnapshot);
    return `${subject.paddockName} terá descansado ${count(numericFact(evaluation.facts, 'restDays'))} dias, menos que os ${count(limit.value)} dias de descanso mínimo (${THRESHOLD_SOURCE_LABELS[limit.source]}).`;
  },
  'rotation.grazing_review_due': (evaluation, subject) => {
    const limit = readThreshold(evaluation.configSnapshot);
    return `${subject.lotName} chega a ${count(numericFact(evaluation.facts, 'grazingDays'))} dias de pastejo, no limite de ${count(limit.value)} dias (${THRESHOLD_SOURCE_LABELS[limit.source]}).`;
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
