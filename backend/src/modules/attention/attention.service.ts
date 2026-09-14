import { Injectable } from '@nestjs/common';
import type { AttentionItemStatus } from '@prisma/client';
import { readThreshold } from '../rule-engine/rule.threshold';
import {
  attentionMeasure,
  attentionTitle,
  describeAttentionItem,
} from './attention.messages';
import { AttentionRepository, scopeKey } from './attention.repository';
import { presentAttentionItem } from './attention.presenter';
import type {
  AttentionPresentation,
  PresentedAttentionItem,
  ProjectableRuleEvaluation,
} from './attention.types';
import { AttentionItemNotFoundError } from './errors/attention-item-not-found.error';

@Injectable()
export class AttentionService {
  constructor(private readonly repository: AttentionRepository) {}

  async list(
    farmId: string,
    status?: AttentionItemStatus,
  ): Promise<PresentedAttentionItem[]> {
    const items = await this.repository.list(farmId, status);
    const names = await this.repository.scopeNames(farmId, items);
    return items.map((item) => presentAttentionItem(item, names));
  }

  project(
    evaluation: ProjectableRuleEvaluation,
    presentation: AttentionPresentation,
  ): Promise<void> {
    return this.repository.project(evaluation, presentation);
  }

  async explain(farmId: string, id: string) {
    const explanation = await this.repository.explanation(farmId, id);
    if (!explanation) throw new AttentionItemNotFoundError();

    const names = await this.repository.scopeNames(farmId, [explanation]);
    const scopeName =
      names.get(scopeKey(explanation.scopeType, explanation.scopeId)) ?? null;
    const threshold = readThreshold(explanation.configurationUsed);

    return {
      ...explanation,
      ruleTitle: attentionTitle(explanation.ruleId),
      summary: describeAttentionItem({
        ruleId: explanation.ruleId,
        scopeType: explanation.scopeType,
        scopeName,
        facts: explanation.facts,
        threshold,
      }),
      scope: {
        type: explanation.scopeType,
        id: explanation.scopeId,
        name: scopeName,
      },
      measured: attentionMeasure(explanation.ruleId, explanation.facts),
      threshold,
    };
  }
}
