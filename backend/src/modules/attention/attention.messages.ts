import { AttentionScopeType } from '@prisma/client';
import { count, THRESHOLD_SOURCE_LABELS } from '../rule-engine/rule.messages';
import {
  numericFact,
  type ResolvedThreshold,
} from '../rule-engine/rule.threshold';

export type AttentionMeasure = {
  label: string;
  value: number | null;
  unit: string;
};

type RuleNarrative = {
  title: string;
  measureLabel: string;
  factKey: string;
  unit: string;
  sentence: (
    subject: string,
    measure: string,
    limit: string,
    source: string,
  ) => string;
};

const NARRATIVES: Record<string, RuleNarrative> = {
  'paddock.stocking_level': {
    title: 'Pasto acima da lotação',
    measureLabel: 'Cabeças no pasto',
    factKey: 'currentHeadCount',
    unit: 'cabeças',
    sentence: (subject, measure, limit, source) =>
      `${subject} está com ${measure} cabeças, acima da lotação de ${limit} (${source}).`,
  },
  'paddock.rest_period': {
    title: 'Descanso curto demais',
    measureLabel: 'Dias de descanso',
    factKey: 'restDays',
    unit: 'dias',
    sentence: (subject, measure, limit, source) =>
      `${subject} recebeu gado depois de ${measure} dias de descanso, menos que os ${limit} dias pedidos (${source}).`,
  },
  'rotation.grazing_review_due': {
    title: 'Pastejo no limite',
    measureLabel: 'Dias de pastejo',
    factKey: 'grazingDays',
    unit: 'dias',
    sentence: (subject, measure, limit, source) =>
      `${subject} está há ${measure} dias no mesmo pasto, contra os ${limit} dias pedidos (${source}).`,
  },
};

const SCOPE_NOUNS: Record<AttentionScopeType, string> = {
  [AttentionScopeType.FARM]: 'a fazenda',
  [AttentionScopeType.PADDOCK]: 'o pasto',
  [AttentionScopeType.LOT]: 'o lote',
  [AttentionScopeType.ANIMAL]: 'o animal',
};

export function attentionTitle(ruleId: string): string {
  return NARRATIVES[ruleId]?.title ?? ruleId;
}

export function attentionMeasure(
  ruleId: string,
  facts: unknown,
): AttentionMeasure | null {
  const narrative = NARRATIVES[ruleId];
  if (!narrative) return null;
  return {
    label: narrative.measureLabel,
    value: numericFact(facts, narrative.factKey),
    unit: narrative.unit,
  };
}

export function describeAttentionItem(input: {
  ruleId: string;
  scopeType: AttentionScopeType;
  scopeName: string | null;
  facts: unknown;
  threshold: ResolvedThreshold;
}): string {
  const subject = input.scopeName ?? SCOPE_NOUNS[input.scopeType];
  const narrative = NARRATIVES[input.ruleId];
  if (!narrative) return `${subject}: ${input.ruleId} exige atenção.`;
  return narrative.sentence(
    subject,
    count(numericFact(input.facts, narrative.factKey)),
    count(input.threshold.value),
    THRESHOLD_SOURCE_LABELS[input.threshold.source],
  );
}
