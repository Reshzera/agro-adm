import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import type { MovementRuleContext } from './rule.types';

@Injectable()
export class RuleEngineRepository {
  constructor(private readonly db: DatabaseService) {}

  async loadMovementContext(
    eventId: string,
    evaluatedAt: Date,
  ): Promise<MovementRuleContext | null> {
    const event = await this.db.client.domainEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        farmId: true,
        eventType: true,
        correlationId: true,
        occurredAt: true,
        aggregateId: true,
        payload: true,
        farm: {
          select: {
            defaultMaxGrazingDays: true,
            defaultMinRestDays: true,
            defaultStockingRateHeadPerHa: true,
          },
        },
      },
    });
    if (!event || event.eventType !== 'CattleLotMoved') return null;

    const payload = event.payload as Record<string, unknown>;
    const destinationId = payload.toPaddockId;
    if (typeof destinationId !== 'string') {
      throw new Error('CattleLotMoved payload has no toPaddockId');
    }

    const [destination, currentLots, previousOccupancy] = await Promise.all([
      this.db.client.farmArea.findFirst({
        where: { id: destinationId, farmId: event.farmId },
        select: {
          id: true,
          usableAreaHa: true,
          plannedCapacityHead: true,
          maxGrazingDays: true,
          minRestDays: true,
        },
      }),
      this.db.client.paddockOccupancy.findMany({
        where: {
          farmId: event.farmId,
          paddockId: destinationId,
          startedAt: { lte: event.occurredAt },
          OR: [{ endedAt: null }, { endedAt: { gt: event.occurredAt } }],
        },
        select: { lot: { select: { headCount: true } } },
      }),
      this.db.client.paddockOccupancy.findFirst({
        where: {
          farmId: event.farmId,
          paddockId: destinationId,
          endedAt: { lte: event.occurredAt },
        },
        orderBy: { endedAt: 'desc' },
        select: { endedAt: true },
      }),
    ]);
    if (!destination) throw new Error('Movement destination no longer exists');

    return {
      farmId: event.farmId,
      eventId: event.id,
      lotId: event.aggregateId,
      correlationId: event.correlationId,
      occurredAt: event.occurredAt,
      evaluatedAt,
      destination: {
        id: destination.id,
        usableAreaHa: destination.usableAreaHa?.toNumber() ?? null,
        plannedCapacityHead: destination.plannedCapacityHead,
        maxGrazingDays: destination.maxGrazingDays,
        minRestDays: destination.minRestDays,
      },
      farmDefaults: {
        maxGrazingDays: event.farm.defaultMaxGrazingDays,
        minRestDays: event.farm.defaultMinRestDays,
        stockingRateHeadPerHa:
          event.farm.defaultStockingRateHeadPerHa?.toNumber() ?? null,
      },
      currentHeadCount: currentLots.reduce(
        (total, occupancy) => total + occupancy.lot.headCount,
        0,
      ),
      previousOccupancyEndedAt: previousOccupancy?.endedAt ?? null,
    };
  }

  writeEvaluation(data: Prisma.RuleEvaluationUncheckedCreateInput) {
    return this.db.client.ruleEvaluation.upsert({
      where: {
        triggerEventId_ruleId_ruleVersion: {
          triggerEventId: data.triggerEventId!,
          ruleId: data.ruleId,
          ruleVersion: data.ruleVersion,
        },
      },
      create: data,
      update: {},
    });
  }
}
