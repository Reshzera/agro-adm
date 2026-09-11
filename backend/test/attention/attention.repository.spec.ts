import {
  AttentionItemStatus,
  AttentionScopeType,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';
import { jest } from '@jest/globals';
import type { DatabaseService } from '../../src/modules/database/database.service';
import { AttentionRepository } from '../../src/modules/attention/attention.repository';
import type { ProjectableRuleEvaluation } from '../../src/modules/attention/attention.types';

function evaluation(
  changes: Partial<ProjectableRuleEvaluation> = {},
): ProjectableRuleEvaluation {
  return {
    id: 'evaluation-1',
    farmId: 'farm-1',
    correlationId: 'movement-correlation-1',
    ruleId: 'paddock.stocking_level',
    ruleVersion: 1,
    status: RuleEvaluationStatus.TRIGGERED,
    severity: RuleSeverity.WARNING,
    scopeType: AttentionScopeType.PADDOCK,
    scopeId: 'paddock-1',
    facts: { currentHeadCount: 120 },
    suggestedAction: { action: 'review_paddock_stocking' },
    evaluatedAt: new Date('2026-03-16T12:00:00.000Z'),
    ...changes,
  };
}

function setup() {
  type WriteArgs = { data: Record<string, unknown> };
  type UpdateArgs = WriteArgs & { where: Record<string, unknown> };
  const client = {
    farmAttentionItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest
        .fn<(input: UpdateArgs) => Promise<{ count: number }>>()
        .mockResolvedValue({ count: 0 }),
      create: jest
        .fn<(input: WriteArgs) => Promise<{ id: string }>>()
        .mockResolvedValue({ id: 'attention-1' }),
    },
    domainEvent: {
      findMany: jest.fn(() => Promise.resolve([])),
    },
  };
  const repository = new AttentionRepository({
    client,
  } as unknown as DatabaseService);
  return { client, repository };
}

const presentation = {
  category: 'CATTLE',
  titleCode: 'attention.paddock_stocking_level',
};

describe('AttentionRepository', () => {
  it('creates an attention item from a triggered rule with its facts and trace', async () => {
    const { client, repository } = setup();
    const result = evaluation();

    await repository.project(result, presentation);

    expect(client.farmAttentionItem.create).toHaveBeenCalledTimes(1);
    expect(
      client.farmAttentionItem.create.mock.calls[0]?.[0].data,
    ).toMatchObject({
      farmId: 'farm-1',
      ruleId: 'paddock.stocking_level',
      ruleVersion: 1,
      ruleEvaluationId: 'evaluation-1',
      correlationId: 'movement-correlation-1',
      severity: RuleSeverity.WARNING,
      facts: result.facts,
      firstSeenAt: result.evaluatedAt,
      lastSeenAt: result.evaluatedAt,
    });
  });

  it('updates the existing open item when the rule triggers again', async () => {
    const { client, repository } = setup();
    client.farmAttentionItem.updateMany.mockResolvedValueOnce({ count: 1 });
    const result = evaluation({
      id: 'evaluation-2',
      correlationId: 'movement-correlation-2',
      facts: { currentHeadCount: 135 },
      evaluatedAt: new Date('2026-03-17T12:00:00.000Z'),
    });

    await repository.project(result, presentation);

    expect(client.farmAttentionItem.create).not.toHaveBeenCalled();
    expect(client.farmAttentionItem.updateMany).toHaveBeenCalledTimes(1);
    expect(
      client.farmAttentionItem.updateMany.mock.calls[0]?.[0],
    ).toMatchObject({
      where: {
        farmId: 'farm-1',
        ruleId: 'paddock.stocking_level',
        scopeId: 'paddock-1',
        status: { in: [AttentionItemStatus.NEW, AttentionItemStatus.SEEN] },
      },
      data: {
        ruleEvaluationId: 'evaluation-2',
        correlationId: 'movement-correlation-2',
        facts: { currentHeadCount: 135 },
        lastSeenAt: result.evaluatedAt,
      },
    });
  });

  it('resolves an open item when the same rule and scope passes', async () => {
    const { client, repository } = setup();
    const passed = evaluation({
      id: 'evaluation-3',
      status: RuleEvaluationStatus.PASSED,
      severity: null,
    });

    await repository.project(passed, presentation);

    expect(client.farmAttentionItem.updateMany).toHaveBeenCalledWith({
      where: {
        farmId: 'farm-1',
        ruleId: 'paddock.stocking_level',
        scopeId: 'paddock-1',
        status: { in: [AttentionItemStatus.NEW, AttentionItemStatus.SEEN] },
      },
      data: {
        status: AttentionItemStatus.RESOLVED,
        resolvedAt: passed.evaluatedAt,
      },
    });
    expect(client.farmAttentionItem.create).not.toHaveBeenCalled();
  });

  it('does not resolve an item when the current evaluation lacks data', async () => {
    const { client, repository } = setup();

    await repository.project(
      evaluation({
        status: RuleEvaluationStatus.INSUFFICIENT_DATA,
        severity: null,
      }),
      presentation,
    );

    expect(client.farmAttentionItem.updateMany).not.toHaveBeenCalled();
    expect(client.farmAttentionItem.create).not.toHaveBeenCalled();
  });

  it('builds an explanation from the historical evaluation and correlated events', async () => {
    const { client, repository } = setup();
    const historicalConfiguration = {
      threshold: { value: 100, unit: 'head', source: 'PADDOCK' },
    };
    client.farmAttentionItem.findFirst.mockResolvedValueOnce({
      id: 'attention-1',
      status: AttentionItemStatus.RESOLVED,
      ruleEvaluation: {
        ...evaluation(),
        configSnapshot: historicalConfiguration,
      },
    });
    client.domainEvent.findMany.mockResolvedValueOnce([
      { id: 'event-1', eventType: 'CattleLotMoved' },
    ]);

    const explanation = await repository.explanation('farm-1', 'attention-1');

    expect(client.farmAttentionItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'attention-1', farmId: 'farm-1' },
      include: { ruleEvaluation: true },
    });
    expect(client.domainEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          farmId: 'farm-1',
          correlationId: 'movement-correlation-1',
        },
      }),
    );
    expect(explanation).toEqual(
      expect.objectContaining({
        ruleVersion: 1,
        facts: { currentHeadCount: 120 },
        configurationUsed: historicalConfiguration,
        correlationId: 'movement-correlation-1',
        sourceEvents: [{ id: 'event-1', eventType: 'CattleLotMoved' }],
      }),
    );
  });
});
