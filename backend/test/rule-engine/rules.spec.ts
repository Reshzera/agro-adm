import { RuleEvaluationStatus, RuleSeverity } from '@prisma/client';
import type { MovementRuleContext } from '../../src/modules/rule-engine/rule.types';
import {
  GrazingReviewDueRule,
  PaddockRestPeriodRule,
  PaddockStockingLevelRule,
} from '../../src/modules/rule-engine/rules';

function context(
  changes: Partial<MovementRuleContext> = {},
): MovementRuleContext {
  return {
    farmId: 'farm-1',
    eventId: 'event-1',
    lotId: 'lot-1',
    correlationId: 'correlation-1',
    occurredAt: new Date('2026-03-01T00:00:00.000Z'),
    evaluatedAt: new Date('2026-03-06T00:00:00.000Z'),
    destination: {
      id: 'paddock-1',
      usableAreaHa: 50,
      plannedCapacityHead: 100,
      maxGrazingDays: 10,
      minRestDays: 30,
    },
    farmDefaults: {
      maxGrazingDays: 12,
      minRestDays: 35,
      stockingRateHeadPerHa: 2,
    },
    currentHeadCount: 80,
    previousOccupancyEndedAt: new Date('2026-01-31T00:00:00.000Z'),
    ...changes,
  };
}

describe('movement rules', () => {
  describe('paddock.stocking_level', () => {
    const rule = new PaddockStockingLevelRule();

    it.each([
      [99, RuleEvaluationStatus.PASSED],
      [101, RuleEvaluationStatus.TRIGGERED],
      [100, RuleEvaluationStatus.PASSED],
    ])('evaluates %s head as %s', (currentHeadCount, status) => {
      const result = rule.evaluate(context({ currentHeadCount }));
      expect(result.status).toBe(status);
      expect(result.configSnapshot.threshold).toEqual({
        value: 100,
        unit: 'head',
        source: 'PADDOCK',
      });
    });

    it('records insufficient data instead of deriving an unknown capacity', () => {
      const base = context();
      const result = rule.evaluate(
        context({
          destination: {
            ...base.destination,
            plannedCapacityHead: null,
            usableAreaHa: null,
          },
        }),
      );
      expect(result.status).toBe(RuleEvaluationStatus.INSUFFICIENT_DATA);
      expect(result.errorCode).toBe('missing_usable_area');
    });
  });

  describe('paddock.rest_period', () => {
    const rule = new PaddockRestPeriodRule();

    it.each([
      ['2026-01-29T00:00:00.000Z', RuleEvaluationStatus.PASSED],
      ['2026-02-01T00:00:00.000Z', RuleEvaluationStatus.TRIGGERED],
      ['2026-01-30T00:00:00.000Z', RuleEvaluationStatus.PASSED],
    ])('evaluates the previous exit as %s', (endedAt, status) => {
      const result = rule.evaluate(
        context({ previousOccupancyEndedAt: new Date(endedAt) }),
      );
      expect(result.status).toBe(status);
    });

    it('passes at the exact 30-day boundary', () => {
      const result = rule.evaluate(
        context({
          previousOccupancyEndedAt: new Date('2026-01-30T00:00:00.000Z'),
        }),
      );
      expect(result.status).toBe(RuleEvaluationStatus.PASSED);
    });

    it('records missing history explicitly', () => {
      const result = rule.evaluate(context({ previousOccupancyEndedAt: null }));
      expect(result.status).toBe(RuleEvaluationStatus.INSUFFICIENT_DATA);
      expect(result.errorCode).toBe('missing_previous_occupancy');
    });
  });

  describe('rotation.grazing_review_due', () => {
    const rule = new GrazingReviewDueRule();

    it('does not trigger before the configured day', () => {
      expect(rule.evaluate(context()).status).toBe(RuleEvaluationStatus.PASSED);
    });

    it('triggers after the configured day', () => {
      const result = rule.evaluate(
        context({ evaluatedAt: new Date('2026-03-12T00:00:00.000Z') }),
      );
      expect(result.status).toBe(RuleEvaluationStatus.TRIGGERED);
      expect(result.severity).toBe(RuleSeverity.INFO);
    });

    it('triggers at the exact configured boundary', () => {
      const result = rule.evaluate(
        context({ evaluatedAt: new Date('2026-03-11T00:00:00.000Z') }),
      );
      expect(result.status).toBe(RuleEvaluationStatus.TRIGGERED);
    });

    it('records a missing threshold explicitly', () => {
      const base = context();
      const result = rule.evaluate(
        context({
          destination: { ...base.destination, maxGrazingDays: null },
          farmDefaults: { ...base.farmDefaults, maxGrazingDays: null },
        }),
      );
      expect(result.status).toBe(RuleEvaluationStatus.INSUFFICIENT_DATA);
      expect(result.errorCode).toBe('missing_maximum_grazing_days');
    });
  });
});
