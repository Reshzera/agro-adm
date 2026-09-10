import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  findForOwner(id: string, ownerUserId: string) {
    return this.prisma.farm.findFirst({
      where: { id, ownerUserId },
      select: farmFields,
    });
  }

  findForAgent(id: string) {
    return this.prisma.farm.findUnique({
      where: { id },
      select: farmFields,
    });
  }

  updateForAgent(id: string, data: Prisma.FarmUpdateInput) {
    return this.prisma.farm.update({ where: { id }, data, select: farmFields });
  }
}
