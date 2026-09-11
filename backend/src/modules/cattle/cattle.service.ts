import { Injectable } from '@nestjs/common';
import { FarmAreaType, type Prisma } from '@prisma/client';
import type { CreateCattleLotDto } from './dto/create-cattle-lot.dto';
import type { CreatePaddockDto } from './dto/create-paddock.dto';
import type { UpdateCattleLotDto } from './dto/update-cattle-lot.dto';
import type { UpdatePaddockDto } from './dto/update-paddock.dto';
import { CattleResourceNotFoundError } from './errors/cattle-resource-not-found.error';
import { InvalidCattleOperationError } from './errors/invalid-cattle-operation.error';
import { CattleRepository } from './cattle.repository';

@Injectable()
export class CattleService {
  constructor(private readonly repository: CattleRepository) {}

  async listLots(farmId: string) {
    return (await this.repository.listLots(farmId)).map((lot) =>
      this.presentLot(lot),
    );
  }

  async createLot(farmId: string, input: CreateCattleLotDto) {
    return this.presentLot(
      await this.repository.createLot({
        farmId,
        name: input.name,
        category: input.category,
        headCount: input.headCount,
        purpose: input.purpose || null,
        startedOn: input.startedOn ? this.dateOnly(input.startedOn) : null,
        notes: input.notes || null,
      }),
    );
  }

  async updateLot(farmId: string, id: string, input: UpdateCattleLotDto) {
    this.requireChanges(input);
    const data: Prisma.CattleLotUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.headCount !== undefined ? { headCount: input.headCount } : {}),
      ...(input.purpose !== undefined
        ? { purpose: input.purpose || null }
        : {}),
      ...(input.startedOn !== undefined
        ? { startedOn: input.startedOn ? this.dateOnly(input.startedOn) : null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    };
    const lot = await this.repository.updateLot(farmId, id, data);
    if (!lot) throw new CattleResourceNotFoundError('Lot');
    return this.presentLot(lot);
  }

  async listPaddocks(farmId: string) {
    const [paddocks, defaults] = await Promise.all([
      this.repository.listPaddocks(farmId),
      this.repository.farmDefaults(farmId),
    ]);
    return paddocks.map((paddock) => this.presentPaddock(paddock, defaults));
  }

  async createPaddock(farmId: string, input: CreatePaddockDto) {
    this.assertAreas(input.hectares, input.usableAreaHa);
    const [paddock, defaults] = await Promise.all([
      this.repository.createPaddock({
        farmId,
        type: FarmAreaType.PASTURE,
        name: input.name,
        hectares: input.hectares,
        usableAreaHa: input.usableAreaHa,
        maxGrazingDays: input.maxGrazingDays,
        minRestDays: input.minRestDays,
        plannedCapacityHead: input.plannedCapacityHead,
        forageType: input.forageType || null,
      }),
      this.repository.farmDefaults(farmId),
    ]);
    return this.presentPaddock(paddock, defaults);
  }

  async updatePaddock(farmId: string, id: string, input: UpdatePaddockDto) {
    this.requireChanges(input);
    const current = await this.repository.findPaddock(farmId, id);
    if (!current) throw new CattleResourceNotFoundError('Paddock');
    this.assertAreas(
      input.hectares === undefined
        ? current.hectares?.toString()
        : input.hectares,
      input.usableAreaHa === undefined
        ? current.usableAreaHa?.toString()
        : input.usableAreaHa,
    );
    const data: Prisma.FarmAreaUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.hectares !== undefined ? { hectares: input.hectares } : {}),
      ...(input.usableAreaHa !== undefined
        ? { usableAreaHa: input.usableAreaHa }
        : {}),
      ...(input.maxGrazingDays !== undefined
        ? { maxGrazingDays: input.maxGrazingDays }
        : {}),
      ...(input.minRestDays !== undefined
        ? { minRestDays: input.minRestDays }
        : {}),
      ...(input.plannedCapacityHead !== undefined
        ? { plannedCapacityHead: input.plannedCapacityHead }
        : {}),
      ...(input.forageType !== undefined
        ? { forageType: input.forageType || null }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    };
    const [paddock, defaults] = await Promise.all([
      this.repository.updatePaddock(farmId, id, data),
      this.repository.farmDefaults(farmId),
    ]);
    if (!paddock) throw new CattleResourceNotFoundError('Paddock');
    return this.presentPaddock(paddock, defaults);
  }

  async placeLot(
    farmId: string,
    lotId: string,
    paddockId: string,
    startedAt: string,
  ) {
    const [lot, paddock, occupancyCount] = await Promise.all([
      this.repository.findLot(farmId, lotId),
      this.repository.findPaddock(farmId, paddockId),
      this.repository.countOccupancies(farmId, lotId),
    ]);
    if (!lot) throw new CattleResourceNotFoundError('Lot');
    if (!paddock) throw new CattleResourceNotFoundError('Paddock');
    if (!lot.active || !paddock.active) {
      throw new InvalidCattleOperationError(
        'Only active lots and paddocks can receive an initial placement.',
      );
    }
    if (occupancyCount) {
      throw new InvalidCattleOperationError(
        'This lot has already been placed. Use a cattle movement to change paddocks.',
      );
    }
    return this.repository.createInitialOccupancy({
      farmId,
      lotId,
      paddockId,
      startedAt: new Date(startedAt),
    });
  }

  private presentLot<T extends { occupancies: unknown[] }>(lot: T) {
    const { occupancies, ...fields } = lot;
    return { ...fields, currentOccupancy: occupancies[0] ?? null };
  }

  private presentPaddock<
    T extends {
      maxGrazingDays: number | null;
      minRestDays: number | null;
      occupancies: unknown[];
    },
  >(
    paddock: T,
    defaults: {
      defaultMaxGrazingDays: number | null;
      defaultMinRestDays: number | null;
      defaultStockingRateHeadPerHa: { toString(): string } | null;
    } | null,
  ) {
    return {
      ...paddock,
      effectiveSettings: {
        maxGrazingDays: this.resolved(
          paddock.maxGrazingDays,
          defaults?.defaultMaxGrazingDays ?? null,
        ),
        minRestDays: this.resolved(
          paddock.minRestDays,
          defaults?.defaultMinRestDays ?? null,
        ),
        stockingRateHeadPerHa: {
          value: defaults?.defaultStockingRateHeadPerHa?.toString() ?? null,
          source: defaults?.defaultStockingRateHeadPerHa ? 'FARM' : 'SYSTEM',
        },
      },
    };
  }

  private resolved(override: number | null, farmDefault: number | null) {
    return override === null
      ? { value: farmDefault, source: farmDefault === null ? 'SYSTEM' : 'FARM' }
      : { value: override, source: 'PADDOCK' };
  }

  private assertAreas(
    hectares: string | null | undefined,
    usableAreaHa: string | null | undefined,
  ): void {
    if (
      hectares != null &&
      usableAreaHa != null &&
      Number(usableAreaHa) > Number(hectares)
    ) {
      throw new InvalidCattleOperationError(
        'Usable area cannot be greater than total area.',
      );
    }
  }

  private requireChanges(input: object): void {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new InvalidCattleOperationError('At least one field must change.');
    }
  }

  private dateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
