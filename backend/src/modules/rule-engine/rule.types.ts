import type {
  AttentionScopeType,
  Prisma,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';

export type ThresholdSource = 'PADDOCK' | 'FARM' | 'UNCONFIGURED';

export type MovementFacts = {
  lotId: string;
  occurredAt: Date;
  evaluatedAt: Date;
  destination: {
    id: string;
    usableAreaHa: number | null;
    plannedCapacityHead: number | null;
    maxGrazingDays: number | null;
    minRestDays: number | null;
  };
  farmDefaults: {
    maxGrazingDays: number | null;
    minRestDays: number | null;
    stockingRateHeadPerHa: number | null;
  };
  currentHeadCount: number;
  previousOccupancyEndedAt: Date | null;
};

export type MovementRuleContext = MovementFacts & {
  farmId: string;
  eventId: string;
  correlationId: string;
};

export type RuleResult = {
  status: RuleEvaluationStatus;
  severity: RuleSeverity | null;
  scopeType: AttentionScopeType;
  scopeId: string;
  facts: Prisma.InputJsonObject;
  configSnapshot: Prisma.InputJsonObject;
  suggestedAction?: Prisma.InputJsonObject;
  errorCode?: string;
};

export interface FarmRule {
  readonly ruleId: string;
  readonly ruleVersion: number;
  readonly attention: {
    category: string;
    titleCode: string;
  };
  evaluate(facts: MovementFacts): RuleResult;
}

export type RulePreview = RuleResult & {
  ruleId: string;
  ruleVersion: number;
};
