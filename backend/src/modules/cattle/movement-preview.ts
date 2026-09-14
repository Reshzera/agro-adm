import { RuleEvaluationStatus, type RuleSeverity } from '@prisma/client';
import { describeRule } from '../rule-engine/rule.messages';
import { numericFact, readThreshold } from '../rule-engine/rule.threshold';
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

export function presentMovementPreview(
  subjects: PreviewSubjects,
): MovementPreview {
  const stocking = subjects.evaluations.find(
    (evaluation) => evaluation.ruleId === STOCKING_RULE,
  );
  const capacity = readThreshold(stocking?.configSnapshot);
  const subject = { lotName: subjects.lot.name, paddockName: subjects.to.name };

  return {
    lot: subjects.lot,
    fromPaddock: subjects.from,
    toPaddock: subjects.to,
    occurredAt: subjects.occurredAt.toISOString(),
    headCount: subjects.lot.headCount,
    destination: {
      headCountAfter: numericFact(stocking?.facts, 'currentHeadCount'),
      capacity: capacity.value,
      capacitySource: capacity.source,
      utilizationPercent: numericFact(stocking?.facts, 'utilizationPercent'),
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
