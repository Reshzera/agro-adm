import { Injectable } from '@nestjs/common';
import type { AttentionItemStatus } from '@prisma/client';
import { AttentionRepository } from './attention.repository';
import type {
  AttentionPresentation,
  ProjectableRuleEvaluation,
} from './attention.types';
import { AttentionItemNotFoundError } from './errors/attention-item-not-found.error';

@Injectable()
export class AttentionService {
  constructor(private readonly repository: AttentionRepository) {}

  list(farmId: string, status?: AttentionItemStatus) {
    return this.repository.list(farmId, status);
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
    return explanation;
  }
}
