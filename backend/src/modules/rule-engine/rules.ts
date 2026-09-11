import {
  AttentionScopeType,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';
import type {
  FarmRule,
  MovementRuleContext,
  RuleResult,
  ThresholdSource,
} from './rule.types';

const DAY_MS = 24 * 60 * 60 * 1_000;

function threshold(
  paddockValue: number | null,
  farmValue: number | null,
): { value: number | null; source: ThresholdSource } {
  if (paddockValue !== null) return { value: paddockValue, source: 'PADDOCK' };
  if (farmValue !== null) return { value: farmValue, source: 'FARM' };
  return { value: null, source: 'UNCONFIGURED' };
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.max(0, (later.getTime() - earlier.getTime()) / DAY_MS);
}

export class PaddockStockingLevelRule implements FarmRule {
  readonly ruleId = 'paddock.stocking_level';
  readonly ruleVersion = 1;
  readonly attention = {
    category: 'CATTLE',
    titleCode: 'attention.paddock_stocking_level',
  };

  evaluate(context: MovementRuleContext): RuleResult {
    const configuredHead = context.destination.plannedCapacityHead;
    const stockingRate = context.farmDefaults.stockingRateHeadPerHa;
    const area = context.destination.usableAreaHa;
    const applied =
      configuredHead !== null
        ? { value: configuredHead, source: 'PADDOCK' as const }
        : stockingRate !== null && area !== null
          ? { value: stockingRate * area, source: 'FARM' as const }
          : { value: null, source: 'UNCONFIGURED' as const };
    const facts = {
      currentHeadCount: context.currentHeadCount,
      usableAreaHa: area,
      configuredStockingRateHeadPerHa: stockingRate,
    };
    const configSnapshot = {
      threshold: {
        value: applied.value,
        unit: 'head',
        source: applied.source,
      },
      derivation:
        configuredHead !== null
          ? 'plannedCapacityHead'
          : 'usableAreaHa * defaultStockingRateHeadPerHa',
    };

    if (applied.value === null) {
      return {
        status: RuleEvaluationStatus.INSUFFICIENT_DATA,
        severity: null,
        scopeType: AttentionScopeType.PADDOCK,
        scopeId: context.destination.id,
        facts,
        configSnapshot,
        errorCode:
          area === null && stockingRate !== null
            ? 'missing_usable_area'
            : 'missing_stocking_threshold',
      };
    }

    const triggered = context.currentHeadCount > applied.value;
    return {
      status: triggered
        ? RuleEvaluationStatus.TRIGGERED
        : RuleEvaluationStatus.PASSED,
      severity: triggered ? RuleSeverity.WARNING : null,
      scopeType: AttentionScopeType.PADDOCK,
      scopeId: context.destination.id,
      facts: {
        ...facts,
        utilizationPercent:
          applied.value === 0
            ? null
            : (context.currentHeadCount / applied.value) * 100,
      },
      configSnapshot,
      ...(triggered
        ? { suggestedAction: { action: 'review_paddock_stocking' } }
        : {}),
    };
  }
}

export class PaddockRestPeriodRule implements FarmRule {
  readonly ruleId = 'paddock.rest_period';
  readonly ruleVersion = 1;
  readonly attention = {
    category: 'CATTLE',
    titleCode: 'attention.paddock_rest_period',
  };

  evaluate(context: MovementRuleContext): RuleResult {
    const applied = threshold(
      context.destination.minRestDays,
      context.farmDefaults.minRestDays,
    );
    const restDays = context.previousOccupancyEndedAt
      ? daysBetween(context.occurredAt, context.previousOccupancyEndedAt)
      : null;
    const facts = {
      previousOccupancyEndedAt:
        context.previousOccupancyEndedAt?.toISOString() ?? null,
      destinationEntryAt: context.occurredAt.toISOString(),
      restDays,
    };
    const configSnapshot = {
      threshold: {
        value: applied.value,
        unit: 'days',
        source: applied.source,
      },
    };

    if (applied.value === null || restDays === null) {
      return {
        status: RuleEvaluationStatus.INSUFFICIENT_DATA,
        severity: null,
        scopeType: AttentionScopeType.PADDOCK,
        scopeId: context.destination.id,
        facts,
        configSnapshot,
        errorCode:
          applied.value === null
            ? 'missing_minimum_rest_days'
            : 'missing_previous_occupancy',
      };
    }

    const triggered = restDays < applied.value;
    return {
      status: triggered
        ? RuleEvaluationStatus.TRIGGERED
        : RuleEvaluationStatus.PASSED,
      severity: triggered ? RuleSeverity.WARNING : null,
      scopeType: AttentionScopeType.PADDOCK,
      scopeId: context.destination.id,
      facts,
      configSnapshot,
      ...(triggered
        ? { suggestedAction: { action: 'review_short_rest_period' } }
        : {}),
    };
  }
}

export class GrazingReviewDueRule implements FarmRule {
  readonly ruleId = 'rotation.grazing_review_due';
  readonly ruleVersion = 1;
  readonly attention = {
    category: 'CATTLE',
    titleCode: 'attention.grazing_review_due',
  };

  evaluate(context: MovementRuleContext): RuleResult {
    const applied = threshold(
      context.destination.maxGrazingDays,
      context.farmDefaults.maxGrazingDays,
    );
    const grazingDays = daysBetween(context.evaluatedAt, context.occurredAt);
    const facts = {
      occupancyStartedAt: context.occurredAt.toISOString(),
      evaluatedAt: context.evaluatedAt.toISOString(),
      grazingDays,
      reviewDueAt:
        applied.value === null
          ? null
          : new Date(
              context.occurredAt.getTime() + applied.value * DAY_MS,
            ).toISOString(),
    };
    const configSnapshot = {
      threshold: {
        value: applied.value,
        unit: 'days',
        source: applied.source,
      },
    };

    if (applied.value === null) {
      return {
        status: RuleEvaluationStatus.INSUFFICIENT_DATA,
        severity: null,
        scopeType: AttentionScopeType.LOT,
        scopeId: context.lotId,
        facts,
        configSnapshot,
        errorCode: 'missing_maximum_grazing_days',
      };
    }

    const triggered = grazingDays >= applied.value;
    return {
      status: triggered
        ? RuleEvaluationStatus.TRIGGERED
        : RuleEvaluationStatus.PASSED,
      severity: triggered ? RuleSeverity.INFO : null,
      scopeType: AttentionScopeType.LOT,
      scopeId: context.lotId,
      facts,
      configSnapshot,
      ...(triggered
        ? { suggestedAction: { action: 'review_grazing_occupancy' } }
        : {}),
    };
  }
}
