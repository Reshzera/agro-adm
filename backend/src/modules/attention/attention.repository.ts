import { Injectable } from '@nestjs/common';
import {
  AttentionItemStatus,
  Prisma,
  RuleEvaluationStatus,
} from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import type {
  AttentionPresentation,
  ProjectableRuleEvaluation,
} from './attention.types';

const OPEN_STATUSES = [AttentionItemStatus.NEW, AttentionItemStatus.SEEN];

function inputJson(value: Prisma.JsonValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class AttentionRepository {
  constructor(private readonly db: DatabaseService) {}

  list(farmId: string, status?: AttentionItemStatus) {
    return this.db.client.farmAttentionItem.findMany({
      where: {
        farmId,
        status: status ?? { in: OPEN_STATUSES },
      },
      orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
    });
  }

  async project(
    evaluation: ProjectableRuleEvaluation,
    presentation: AttentionPresentation,
  ): Promise<void> {
    if (
      evaluation.status === RuleEvaluationStatus.TRIGGERED &&
      evaluation.severity
    ) {
      await this.upsertOpen(evaluation, presentation);
      return;
    }

    if (evaluation.status === RuleEvaluationStatus.PASSED) {
      await this.db.client.farmAttentionItem.updateMany({
        where: {
          farmId: evaluation.farmId,
          ruleId: evaluation.ruleId,
          scopeId: evaluation.scopeId,
          status: { in: OPEN_STATUSES },
        },
        data: {
          status: AttentionItemStatus.RESOLVED,
          resolvedAt: evaluation.evaluatedAt,
        },
      });
    }
  }

  async explanation(farmId: string, id: string) {
    const item = await this.db.client.farmAttentionItem.findFirst({
      where: { id, farmId },
      include: { ruleEvaluation: true },
    });
    if (!item?.ruleEvaluation) return null;

    const evaluation = item.ruleEvaluation;
    const sourceEvents = await this.db.client.domainEvent.findMany({
      where: {
        farmId,
        correlationId: evaluation.correlationId,
      },
      select: {
        id: true,
        eventType: true,
        eventVersion: true,
        aggregateType: true,
        aggregateId: true,
        actorType: true,
        actorId: true,
        source: true,
        correlationId: true,
        causationId: true,
        payload: true,
        metadata: true,
        occurredAt: true,
        recordedAt: true,
      },
      orderBy: [{ occurredAt: 'asc' }, { recordedAt: 'asc' }],
    });

    return {
      attentionItemId: item.id,
      attentionItemStatus: item.status,
      decisionType: 'RULE_EVALUATION' as const,
      ruleEvaluationId: evaluation.id,
      ruleId: evaluation.ruleId,
      ruleVersion: evaluation.ruleVersion,
      status: evaluation.status,
      severity: evaluation.severity,
      scopeType: evaluation.scopeType,
      scopeId: evaluation.scopeId,
      facts: evaluation.facts,
      configurationUsed: evaluation.configSnapshot,
      sourceEvents,
      suggestedAction: evaluation.suggestedAction,
      correlationId: evaluation.correlationId,
      evaluatedAt: evaluation.evaluatedAt,
    };
  }

  private async upsertOpen(
    evaluation: ProjectableRuleEvaluation,
    presentation: AttentionPresentation,
  ): Promise<void> {
    const where = {
      farmId: evaluation.farmId,
      ruleId: evaluation.ruleId,
      scopeId: evaluation.scopeId,
      status: { in: OPEN_STATUSES },
    };
    const data = {
      ruleVersion: evaluation.ruleVersion,
      scopeType: evaluation.scopeType,
      ruleEvaluationId: evaluation.id,
      correlationId: evaluation.correlationId,
      category: presentation.category,
      severity: evaluation.severity!,
      titleCode: presentation.titleCode,
      facts: inputJson(evaluation.facts),
      suggestedAction:
        evaluation.suggestedAction === null
          ? Prisma.JsonNull
          : inputJson(evaluation.suggestedAction),
      lastSeenAt: evaluation.evaluatedAt,
      resolvedAt: null,
    };

    const updated = await this.db.client.farmAttentionItem.updateMany({
      where,
      data,
    });
    if (updated.count > 0) return;

    try {
      await this.db.client.farmAttentionItem.create({
        data: {
          farmId: evaluation.farmId,
          ruleId: evaluation.ruleId,
          scopeId: evaluation.scopeId,
          firstSeenAt: evaluation.evaluatedAt,
          ...data,
        },
      });
    } catch (error) {
      // Another delivery may have created the partial-unique open row after the
      // update above. Converge on that row without hiding unrelated failures.
      if (!isUniqueConstraintError(error)) throw error;
      await this.db.client.farmAttentionItem.updateMany({ where, data });
    }
  }
}
