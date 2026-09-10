import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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
    await this.getForAgent(farmId);
    return this.repository.updateForAgent(farmId, data);
  }
}
