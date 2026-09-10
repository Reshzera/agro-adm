import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FarmRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForOwner(id: string, ownerUserId: string) {
    return this.prisma.farm.findFirst({
      where: { id, ownerUserId },
      select: { id: true, name: true, onboardingCompleted: true },
    });
  }

  findForAgent(id: string) {
    return this.prisma.farm.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        totalAreaHa: true,
        primaryActivity: true,
        location: true,
        agentContext: true,
        onboardingCompleted: true,
      },
    });
  }

  updateForAgent(id: string, data: Prisma.FarmUpdateInput) {
    return this.prisma.farm.update({ where: { id }, data });
  }
}
