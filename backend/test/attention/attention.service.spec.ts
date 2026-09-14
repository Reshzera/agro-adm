import {
  AttentionItemStatus,
  AttentionScopeType,
  RuleEvaluationStatus,
  RuleSeverity,
} from '@prisma/client';
import { jest } from '@jest/globals';
import { AttentionService } from '../../src/modules/attention/attention.service';
import type { AttentionRepository } from '../../src/modules/attention/attention.repository';

const FARM_ID = 'farm-1';

const stockingItem = {
  id: 'attention-stocking',
  status: AttentionItemStatus.NEW,
  severity: RuleSeverity.WARNING,
  category: 'CATTLE',
  ruleId: 'paddock.stocking_level',
  ruleVersion: 1,
  scopeType: AttentionScopeType.PADDOCK,
  scopeId: 'paddock-4',
  facts: { currentHeadCount: 180, usableAreaHa: 58, utilizationPercent: 150 },
  suggestedAction: { action: 'review_paddock_stocking' },
  correlationId: 'movement-correlation-1',
  firstSeenAt: new Date('2026-03-04T11:00:00.000Z'),
  lastSeenAt: new Date('2026-03-04T11:00:00.000Z'),
  ruleEvaluation: {
    configSnapshot: {
      threshold: { value: 120, unit: 'head', source: 'PADDOCK' },
    },
    evaluatedAt: new Date('2026-03-04T11:00:00.000Z'),
  },
};

const grazingItem = {
  id: 'attention-grazing',
  status: AttentionItemStatus.NEW,
  severity: RuleSeverity.INFO,
  category: 'CATTLE',
  ruleId: 'rotation.grazing_review_due',
  ruleVersion: 1,
  scopeType: AttentionScopeType.LOT,
  scopeId: 'lot-12',
  facts: { grazingDays: 12 },
  suggestedAction: null,
  correlationId: 'movement-correlation-1',
  firstSeenAt: new Date('2026-03-16T09:00:00.000Z'),
  lastSeenAt: new Date('2026-03-16T09:00:00.000Z'),
  ruleEvaluation: {
    configSnapshot: { threshold: { value: 10, unit: 'days', source: 'FARM' } },
    evaluatedAt: new Date('2026-03-16T09:00:00.000Z'),
  },
};

function setup(items = [stockingItem, grazingItem]) {
  const repository = {
    list: jest.fn(() => Promise.resolve(items)),
    scopeNames: jest.fn(() =>
      Promise.resolve(
        new Map([
          ['PADDOCK:paddock-4', 'Pasto 4'],
          ['LOT:lot-12', 'Lote 12'],
        ]),
      ),
    ),
    explanation: jest.fn(),
    project: jest.fn(),
  };
  return {
    repository,
    service: new AttentionService(repository as unknown as AttentionRepository),
  };
}

describe('AttentionService', () => {
  it('lists only what is open, in the order the repository ranks it', async () => {
    const { repository, service } = setup();

    const items = await service.list(FARM_ID);

    expect(repository.list).toHaveBeenCalledWith(FARM_ID, undefined);
    expect(items.map((item) => item.id)).toEqual([
      'attention-stocking',
      'attention-grazing',
    ]);
    expect(items.map((item) => item.severity)).toEqual([
      RuleSeverity.WARNING,
      RuleSeverity.INFO,
    ]);
  });

  it('states the measured value against the configured threshold instead of a bare warning', async () => {
    const { service } = setup();

    const [stocking, grazing] = await service.list(FARM_ID);

    expect(stocking.summary).toBe(
      'Pasto 4 está com 180 cabeças, acima da lotação de 120 (limite do próprio pasto).',
    );
    expect(stocking.measured).toEqual({
      label: 'Cabeças no pasto',
      value: 180,
      unit: 'cabeças',
    });
    expect(stocking.threshold).toEqual({
      value: 120,
      unit: 'head',
      source: 'PADDOCK',
    });
    expect(grazing.summary).toBe(
      'Lote 12 está há 12 dias no mesmo pasto, contra os 10 dias pedidos (padrão da fazenda).',
    );
  });

  it('points every item at the paddock or the lot it concerns', async () => {
    const { service } = setup();

    const [stocking, grazing] = await service.list(FARM_ID);

    expect(stocking.scope).toEqual({
      type: AttentionScopeType.PADDOCK,
      id: 'paddock-4',
      name: 'Pasto 4',
    });
    expect(grazing.scope).toEqual({
      type: AttentionScopeType.LOT,
      id: 'lot-12',
      name: 'Lote 12',
    });
  });

  it('explains an item from the evaluation it was projected from, with the rule version that decided', async () => {
    const { repository, service } = setup();
    repository.explanation.mockReturnValueOnce(
      Promise.resolve({
        attentionItemId: 'attention-stocking',
        attentionItemStatus: AttentionItemStatus.NEW,
        decisionType: 'RULE_EVALUATION' as const,
        ruleEvaluationId: 'evaluation-1',
        ruleId: 'paddock.stocking_level',
        ruleVersion: 1,
        status: RuleEvaluationStatus.TRIGGERED,
        severity: RuleSeverity.WARNING,
        scopeType: AttentionScopeType.PADDOCK,
        scopeId: 'paddock-4',
        facts: { currentHeadCount: 180 },
        configurationUsed: {
          threshold: { value: 120, unit: 'head', source: 'PADDOCK' },
        },
        sourceEvents: [{ id: 'event-1', eventType: 'CattleLotMoved' }],
        suggestedAction: { action: 'review_paddock_stocking' },
        correlationId: 'movement-correlation-1',
        evaluatedAt: new Date('2026-03-04T11:00:00.000Z'),
      }),
    );

    const explanation = await service.explain(FARM_ID, 'attention-stocking');

    expect(explanation).toMatchObject({
      ruleId: 'paddock.stocking_level',
      ruleVersion: 1,
      ruleTitle: 'Pasto acima da lotação',
      summary:
        'Pasto 4 está com 180 cabeças, acima da lotação de 120 (limite do próprio pasto).',
      threshold: { value: 120, unit: 'head', source: 'PADDOCK' },
      scope: {
        type: AttentionScopeType.PADDOCK,
        id: 'paddock-4',
        name: 'Pasto 4',
      },
      sourceEvents: [{ id: 'event-1', eventType: 'CattleLotMoved' }],
    });
  });

  it('reads the threshold from the stored snapshot, so raising it later does not rewrite yesterday', async () => {
    const { service } = setup([
      {
        ...stockingItem,
        ruleEvaluation: {
          configSnapshot: {
            threshold: { value: 120, unit: 'head', source: 'PADDOCK' },
          },
          evaluatedAt: new Date('2026-03-04T11:00:00.000Z'),
        },
      },
    ]);

    const [item] = await service.list(FARM_ID);

    expect(item.summary).toContain('acima da lotação de 120');
    expect(item.threshold.value).toBe(120);
  });

  it('refuses to explain an item that is not this farm', async () => {
    const { repository, service } = setup();
    repository.explanation.mockReturnValueOnce(Promise.resolve(null));

    await expect(
      service.explain(FARM_ID, 'attention-elsewhere'),
    ).rejects.toThrow();
  });
});
