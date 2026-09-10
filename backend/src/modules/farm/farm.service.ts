import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { UpdateFarmDto } from './dto/update-farm.dto';
import { FarmNotFoundError } from './errors/farm-not-found.error';
import { FarmRepository } from './farm.repository';

@Injectable()
export class FarmService {
  constructor(private readonly repository: FarmRepository) {}

  async getForOwner(id: string, ownerUserId: string) {
    const farm = await this.repository.findForOwner(id, ownerUserId);

    if (!farm) throw new FarmNotFoundError();
    return farm;
  }

  async getForAgent(farmId: string) {
    const farm = await this.repository.findForAgent(farmId);
    if (!farm) throw new FarmNotFoundError();
    return farm;
  }

  async updateForAgent(farmId: string, data: Prisma.FarmUpdateInput) {
    const current = await this.getForAgent(farmId);
    const changes = this.definedFields(data);
    return this.repository.updateForAgent(farmId, {
      ...changes,
      onboardingCompleted: this.isOnboardingComplete({
        ...current,
        ...changes,
      }),
    });
  }

  async updateForOwner(
    farmId: string,
    ownerUserId: string,
    data: UpdateFarmDto,
  ) {
    const current = await this.getForOwner(farmId, ownerUserId);
    const changes = this.definedFields(data);
    return this.repository.updateForAgent(farmId, {
      ...changes,
      onboardingCompleted: this.isOnboardingComplete({
        ...current,
        ...changes,
      }),
    });
  }

  private definedFields<T extends object>(data: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private isOnboardingComplete(farm: {
    name?: unknown;
    totalAreaHa?: unknown;
    primaryActivity?: unknown;
    location?: unknown;
  }): boolean {
    return [
      farm.name,
      farm.totalAreaHa,
      farm.primaryActivity,
      farm.location,
    ].every((value) => value !== null && value !== undefined && value !== '');
  }
}
