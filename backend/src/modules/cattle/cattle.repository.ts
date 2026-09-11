import { Injectable } from '@nestjs/common';
import {
  type ActorType,
  type DomainEventSource,
  FarmAreaType,
  type Prisma,
} from '@prisma/client';
import { DatabaseService } from '../database/database.service';

const occupancy = {
  where: { endedAt: null },
  take: 1,
  orderBy: { startedAt: 'desc' as const },
  select: {
    id: true,
    startedAt: true,
    paddock: { select: { id: true, name: true } },
  },
};

const lotInclude = { occupancies: occupancy } satisfies Prisma.CattleLotInclude;

const paddockInclude = {
  occupancies: {
    where: { endedAt: null },
    select: {
      id: true,
      startedAt: true,
      lot: { select: { id: true, name: true, headCount: true } },
    },
    orderBy: { startedAt: 'asc' as const },
  },
} satisfies Prisma.FarmAreaInclude;

@Injectable()
export class CattleRepository {
  constructor(private readonly db: DatabaseService) {}

  listLots(farmId: string) {
    return this.db.client.cattleLot.findMany({
      where: { farmId },
      include: lotInclude,
      orderBy: { name: 'asc' },
    });
  }

  findLot(farmId: string, id: string) {
    return this.db.client.cattleLot.findFirst({
      where: { id, farmId },
      include: lotInclude,
    });
  }

  createLot(data: Prisma.CattleLotUncheckedCreateInput) {
    return this.db.client.cattleLot.create({ data, include: lotInclude });
  }

  async updateLot(
    farmId: string,
    id: string,
    data: Prisma.CattleLotUpdateInput,
  ) {
    const result = await this.db.client.cattleLot.updateMany({
      where: { id, farmId },
      data,
    });
    return result.count ? this.findLot(farmId, id) : null;
  }

  listPaddocks(farmId: string) {
    return this.db.client.farmArea.findMany({
      where: { farmId, type: FarmAreaType.PASTURE },
      include: paddockInclude,
      orderBy: { name: 'asc' },
    });
  }

  findPaddock(farmId: string, id: string) {
    return this.db.client.farmArea.findFirst({
      where: { id, farmId, type: FarmAreaType.PASTURE },
      include: paddockInclude,
    });
  }

  createPaddock(data: Prisma.FarmAreaUncheckedCreateInput) {
    return this.db.client.farmArea.create({
      data,
      include: paddockInclude,
    });
  }

  async updatePaddock(
    farmId: string,
    id: string,
    data: Prisma.FarmAreaUpdateInput,
  ) {
    const result = await this.db.client.farmArea.updateMany({
      where: { id, farmId, type: FarmAreaType.PASTURE },
      data,
    });
    return result.count ? this.findPaddock(farmId, id) : null;
  }

  farmDefaults(farmId: string) {
    return this.db.client.farm.findUnique({
      where: { id: farmId },
      select: {
        defaultMaxGrazingDays: true,
        defaultMinRestDays: true,
        defaultStockingRateHeadPerHa: true,
      },
    });
  }

  countOccupancies(farmId: string, lotId: string) {
    return this.db.client.paddockOccupancy.count({ where: { farmId, lotId } });
  }

  createInitialOccupancy(data: {
    farmId: string;
    lotId: string;
    paddockId: string;
    startedAt: Date;
  }) {
    return this.db.client.paddockOccupancy.create({
      data,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        paddock: { select: { id: true, name: true } },
        lot: { select: { id: true, name: true, headCount: true } },
      },
    });
  }

  findMovementIdempotency(farmId: string, key: string) {
    return this.db.client.idempotencyKey.findUnique({
      where: {
        farmId_scope_key: { farmId, scope: 'cattle.move-lot', key },
      },
    });
  }

  createMovementIdempotency(farmId: string, key: string, requestHash: string) {
    return this.db.client.idempotencyKey.create({
      data: { farmId, scope: 'cattle.move-lot', key, requestHash },
    });
  }

  completeMovementIdempotency(id: string, result: Prisma.InputJsonValue) {
    return this.db.client.idempotencyKey.update({
      where: { id },
      data: { result, completedAt: new Date() },
    });
  }

  findLotForMovement(farmId: string, id: string) {
    return this.db.client.cattleLot.findFirst({
      where: { farmId, id },
      select: { id: true, name: true, headCount: true, active: true },
    });
  }

  findDestinationForMovement(farmId: string, id: string) {
    return this.db.client.farmArea.findFirst({
      where: { farmId, id, type: FarmAreaType.PASTURE },
      select: { id: true, name: true, active: true },
    });
  }

  findOpenOccupancyForMovement(farmId: string, lotId: string) {
    return this.db.client.paddockOccupancy.findFirst({
      where: { farmId, lotId, endedAt: null },
      select: {
        id: true,
        paddockId: true,
        startedAt: true,
        paddock: { select: { id: true, name: true } },
      },
    });
  }

  closeOccupancy(id: string, farmId: string, endedAt: Date) {
    return this.db.client.paddockOccupancy.updateMany({
      where: { id, farmId, endedAt: null },
      data: { endedAt },
    });
  }

  createMovement(data: {
    farmId: string;
    lotId: string;
    fromPaddockId: string;
    toPaddockId: string;
    headCount: number;
    occurredAt: Date;
    actorType: ActorType;
    actorId: string;
    source: DomainEventSource;
    reason: string | null;
    notes: string | null;
    correlationId: string;
  }) {
    return this.db.client.cattleMovement.create({ data });
  }

  openMovementOccupancy(data: {
    farmId: string;
    lotId: string;
    paddockId: string;
    startedAt: Date;
    correlationId: string;
  }) {
    return this.db.client.paddockOccupancy.create({ data });
  }

  createMovementEvent(data: Prisma.DomainEventUncheckedCreateInput) {
    return this.db.client.domainEvent.create({
      data: { ...data, outbox: { create: {} } },
      include: { outbox: true },
    });
  }
}
