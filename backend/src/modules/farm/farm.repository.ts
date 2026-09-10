import { Injectable } from '@nestjs/common';
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
}
