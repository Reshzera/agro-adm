import type {
  AttentionItemStatus,
  AttentionScopeType,
  Prisma,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';
import type { ResolvedThreshold } from '../rule-engine/rule.threshold';
import type { AttentionMeasure } from './attention.messages';

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

export type AttentionScope = {
  type: AttentionScopeType;
  id: string;
  name: string | null;
};

export type PresentedAttentionItem = {
  id: string;
  status: AttentionItemStatus;
  severity: RuleSeverity;
  category: string;
  ruleId: string;
  ruleVersion: number;
  title: string;
  summary: string;
  scope: AttentionScope;
  measured: AttentionMeasure | null;
  threshold: ResolvedThreshold;
  facts: Prisma.JsonValue;
  suggestedAction: Prisma.JsonValue | null;
  correlationId: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
};
