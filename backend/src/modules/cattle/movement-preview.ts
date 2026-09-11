import {
  RuleEvaluationStatus,
  type Prisma,
  type RuleSeverity,
} from '@prisma/client';
import { describeRule } from '../rule-engine/rule.messages';
import type { RulePreview, ThresholdSource } from '../rule-engine/rule.types';

const STOCKING_RULE = 'paddock.stocking_level';

export type MovementPreview = {
  lot: { id: string; name: string; headCount: number };
  fromPaddock: { id: string; name: string };
  toPaddock: { id: string; name: string };
  occurredAt: string;
  headCount: number;
  destination: {
    headCountAfter: number | null;
    capacity: number | null;
    capacitySource: ThresholdSource;
    utilizationPercent: number | null;
  };
  warnings: { ruleId: string; severity: RuleSeverity; message: string }[];
};

type PreviewSubjects = {
  lot: { id: string; name: string; headCount: number };
  from: { id: string; name: string };
  to: { id: string; name: string };
  occurredAt: Date;
  evaluations: RulePreview[];
};

function numeric(
  source: Prisma.InputJsonObject | undefined,
  key: string,
): number | null {
  const value = source?.[key];
  return typeof value === 'number' ? value : null;
}

function thresholdOf(evaluation: RulePreview | undefined): {
  value: number | null;
  source: ThresholdSource;
} {
  const raw = evaluation?.configSnapshot.threshold;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { value: null, source: 'UNCONFIGURED' };
  }
  const record = raw as Prisma.InputJsonObject;
  return {
    value: numeric(record, 'value'),
    source: (record.source as ThresholdSource | undefined) ?? 'UNCONFIGURED',
  };
}

export function presentMovementPreview(
  subjects: PreviewSubjects,
): MovementPreview {
  const stocking = subjects.evaluations.find(
    (evaluation) => evaluation.ruleId === STOCKING_RULE,
  );
  const capacity = thresholdOf(stocking);
  const subject = { lotName: subjects.lot.name, paddockName: subjects.to.name };

  return {
    lot: subjects.lot,
    fromPaddock: subjects.from,
    toPaddock: subjects.to,
    occurredAt: subjects.occurredAt.toISOString(),
    headCount: subjects.lot.headCount,
    destination: {
      headCountAfter: numeric(stocking?.facts, 'currentHeadCount'),
      capacity: capacity.value,
      capacitySource: capacity.source,
      utilizationPercent: numeric(stocking?.facts, 'utilizationPercent'),
    },
    warnings: subjects.evaluations
      .filter(
        (evaluation) =>
          evaluation.status === RuleEvaluationStatus.TRIGGERED &&
          evaluation.severity !== null,
      )
      .map((evaluation) => ({
        ruleId: evaluation.ruleId,
        severity: evaluation.severity!,
        message: describeRule(evaluation, subject),
      })),
  };
}
