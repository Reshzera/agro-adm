import { Injectable } from '@nestjs/common';
import { AttentionService } from '../attention/attention.service';
import { MOVEMENT_RULES } from './rule.registry';
import { RuleEngineRepository } from './rule-engine.repository';

@Injectable()
export class RuleEngineService {
  constructor(
    private readonly repository: RuleEngineRepository,
    private readonly attention: AttentionService,
  ) {}

  async handle(eventId: string, evaluatedAt = new Date()): Promise<boolean> {
    const context = await this.repository.loadMovementContext(
      eventId,
      evaluatedAt,
    );
    if (!context) return false;

    for (const rule of MOVEMENT_RULES) {
      const startedAt = performance.now();
      const result = rule.evaluate(context);
      const evaluation = await this.repository.writeEvaluation({
        farmId: context.farmId,
        triggerEventId: context.eventId,
        correlationId: context.correlationId,
        ruleId: rule.ruleId,
        ruleVersion: rule.ruleVersion,
        status: result.status,
        severity: result.severity,
        scopeType: result.scopeType,
        scopeId: result.scopeId,
        facts: result.facts,
        configSnapshot: result.configSnapshot,
        suggestedAction: result.suggestedAction,
        evaluatedAt: context.evaluatedAt,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        errorCode: result.errorCode,
      });
      await this.attention.project(evaluation, rule.attention);
    }
    return true;
  }
}
