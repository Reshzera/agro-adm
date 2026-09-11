import type {
  AttentionScopeType,
  Prisma,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';

export type AttentionPresentation = {
  category: string;
  titleCode: string;
};

export type ProjectableRuleEvaluation = {
  id: string;
  farmId: string;
  correlationId: string;
  ruleId: string;
  ruleVersion: number;
  status: RuleEvaluationStatus;
  severity: RuleSeverity | null;
  scopeType: AttentionScopeType;
  scopeId: string;
  facts: Prisma.JsonValue;
  suggestedAction: Prisma.JsonValue | null;
  evaluatedAt: Date;
};
