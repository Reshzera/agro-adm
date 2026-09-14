import type {
  AttentionItemStatus,
  AttentionScopeType,
  Prisma,
  RuleSeverity,
} from '@prisma/client';
import { readThreshold } from '../rule-engine/rule.threshold';
import {
  attentionMeasure,
  attentionTitle,
  describeAttentionItem,
} from './attention.messages';
import { scopeKey } from './attention.repository';
import type { PresentedAttentionItem } from './attention.types';

type StoredAttentionItem = {
  id: string;
  status: AttentionItemStatus;
  severity: RuleSeverity;
  category: string;
  ruleId: string;
  ruleVersion: number;
  scopeType: AttentionScopeType;
  scopeId: string;
  facts: Prisma.JsonValue;
  suggestedAction: Prisma.JsonValue | null;
  correlationId: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  ruleEvaluation: { configSnapshot: Prisma.JsonValue | null } | null;
};

export function presentAttentionItem(
  item: StoredAttentionItem,
  names: Map<string, string>,
): PresentedAttentionItem {
  const scopeName = names.get(scopeKey(item.scopeType, item.scopeId)) ?? null;
  const threshold = readThreshold(item.ruleEvaluation?.configSnapshot);

  return {
    id: item.id,
    status: item.status,
    severity: item.severity,
    category: item.category,
    ruleId: item.ruleId,
    ruleVersion: item.ruleVersion,
    title: attentionTitle(item.ruleId),
    summary: describeAttentionItem({
      ruleId: item.ruleId,
      scopeType: item.scopeType,
      scopeName,
      facts: item.facts,
      threshold,
    }),
    scope: { type: item.scopeType, id: item.scopeId, name: scopeName },
    measured: attentionMeasure(item.ruleId, item.facts),
    threshold,
    facts: item.facts,
    suggestedAction: item.suggestedAction,
    correlationId: item.correlationId,
    firstSeenAt: item.firstSeenAt,
    lastSeenAt: item.lastSeenAt,
  };
}
