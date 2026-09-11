import {
  AttentionScopeType,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';
import { jest } from '@jest/globals';
import type { AttentionService } from '../../src/modules/attention/attention.service';
import type { RuleEngineRepository } from '../../src/modules/rule-engine/rule-engine.repository';
import { RuleEngineService } from '../../src/modules/rule-engine/rule-engine.service';
import type {
  MovementFacts,
  MovementRuleContext,
} from '../../src/modules/rule-engine/rule.types';

describe('RuleEngineService attention projection', () => {
  it('projects every persisted evaluation before completing the event', async () => {
    const context: MovementRuleContext = {
      farmId: 'farm-1',
      eventId: 'event-1',
      lotId: 'lot-1',
      correlationId: 'correlation-1',
      occurredAt: new Date('2026-03-01T00:00:00.000Z'),
      evaluatedAt: new Date('2026-03-16T00:00:00.000Z'),
      destination: {
        id: 'paddock-1',
        usableAreaHa: 20,
        plannedCapacityHead: 50,
        maxGrazingDays: 10,
        minRestDays: 20,
      },
      farmDefaults: {
        maxGrazingDays: null,
        minRestDays: null,
        stockingRateHeadPerHa: null,
      },
      currentHeadCount: 60,
      previousOccupancyEndedAt: new Date('2026-02-20T00:00:00.000Z'),
    };
    const repository = {
      loadMovementContext: jest.fn(() => Promise.resolve(context)),
      writeEvaluation: jest.fn((data: Record<string, unknown>) =>
        Promise.resolve({ id: `evaluation-${String(data.ruleId)}`, ...data }),
      ),
    };
    const attention = { project: jest.fn(() => Promise.resolve()) };
    const service = new RuleEngineService(
      repository as unknown as RuleEngineRepository,
      attention as unknown as AttentionService,
    );

    await expect(service.handle('event-1', context.evaluatedAt)).resolves.toBe(
      true,
    );

    expect(repository.writeEvaluation).toHaveBeenCalledTimes(3);
    expect(attention.project).toHaveBeenCalledTimes(3);
    expect(attention.project).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'paddock.stocking_level',
        status: RuleEvaluationStatus.TRIGGERED,
        severity: RuleSeverity.WARNING,
        scopeType: AttentionScopeType.PADDOCK,
        correlationId: 'correlation-1',
        evaluatedAt: context.evaluatedAt,
      }),
      {
        category: 'CATTLE',
        titleCode: 'attention.paddock_stocking_level',
      },
    );
  });

  it('previews every rule without touching the database or attention items', () => {
    const facts: MovementFacts = {
      lotId: 'lot-1',
      occurredAt: new Date('2026-03-01T00:00:00.000Z'),
      evaluatedAt: new Date('2026-03-16T00:00:00.000Z'),
      destination: {
        id: 'paddock-1',
        usableAreaHa: 20,
        plannedCapacityHead: 50,
        maxGrazingDays: 10,
        minRestDays: 20,
      },
      farmDefaults: {
        maxGrazingDays: null,
        minRestDays: null,
        stockingRateHeadPerHa: null,
      },
      currentHeadCount: 60,
      previousOccupancyEndedAt: new Date('2026-02-20T00:00:00.000Z'),
    };
    const repository = {
      loadMovementContext: jest.fn(),
      writeEvaluation: jest.fn(),
    };
    const attention = { project: jest.fn() };
    const service = new RuleEngineService(
      repository as unknown as RuleEngineRepository,
      attention as unknown as AttentionService,
    );

    const evaluations = service.preview(facts);

    expect(evaluations.map((evaluation) => evaluation.ruleId)).toEqual([
      'paddock.stocking_level',
      'paddock.rest_period',
      'rotation.grazing_review_due',
    ]);
    expect(evaluations[0]).toEqual(
      expect.objectContaining({
        status: RuleEvaluationStatus.TRIGGERED,
        severity: RuleSeverity.WARNING,
      }),
    );
    expect(repository.writeEvaluation).not.toHaveBeenCalled();
    expect(attention.project).not.toHaveBeenCalled();
  });
});
