import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

const farmFields = {
  id: true,
  name: true,
  totalAreaHa: true,
  primaryActivity: true,
  location: true,
  mainCrops: true,
  approximateAnimalCount: true,
  agentContext: true,
  onboardingCompleted: true,
} satisfies Prisma.FarmSelect;

@Injectable()
export class FarmRepository {
  constructor(private readonly db: DatabaseService) {}

  findForOwner(id: string, ownerUserId: string) {
    return this.db.client.farm.findFirst({
      where: { id, ownerUserId },
      select: farmFields,
    });
  }

  findForAgent(id: string) {
    return this.db.client.farm.findUnique({
      where: { id },
      select: farmFields,
    });
  }

  updateForAgent(id: string, data: Prisma.FarmUpdateInput) {
    return this.db.client.farm.update({
      where: { id },
      data,
      select: farmFields,
    });
  }
}
