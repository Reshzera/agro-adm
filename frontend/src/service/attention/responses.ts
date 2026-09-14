export type AttentionSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AttentionItemStatus = "NEW" | "SEEN" | "RESOLVED";

export type AttentionScopeType = "FARM" | "PADDOCK" | "LOT" | "ANIMAL";

export type ThresholdSource = "PADDOCK" | "FARM" | "UNCONFIGURED";

export type AttentionScope = {
  type: AttentionScopeType;
  id: string;
  name: string | null;
};

export type AttentionThreshold = {
  value: number | null;
  unit: string | null;
  source: ThresholdSource;
};

export type AttentionMeasure = {
  label: string;
  value: number | null;
  unit: string;
};

export type AttentionItem = {
  id: string;
  status: AttentionItemStatus;
  severity: AttentionSeverity;
  category: string;
  ruleId: string;
  ruleVersion: number;
  title: string;
  summary: string;
  scope: AttentionScope;
  measured: AttentionMeasure | null;
  threshold: AttentionThreshold;
  facts: Record<string, unknown> | null;
  suggestedAction: Record<string, unknown> | null;
  correlationId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AttentionSourceEvent = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  actorType: string;
  source: string;
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
};

export type AttentionExplanation = {
  attentionItemId: string;
  attentionItemStatus: AttentionItemStatus;
  ruleEvaluationId: string;
  ruleId: string;
  ruleTitle: string;
  ruleVersion: number;
  severity: AttentionSeverity | null;
  summary: string;
  scope: AttentionScope;
  measured: AttentionMeasure | null;
  threshold: AttentionThreshold;
  facts: Record<string, unknown> | null;
  configurationUsed: Record<string, unknown> | null;
  sourceEvents: AttentionSourceEvent[];
  suggestedAction: Record<string, unknown> | null;
  correlationId: string | null;
  evaluatedAt: string;
};
