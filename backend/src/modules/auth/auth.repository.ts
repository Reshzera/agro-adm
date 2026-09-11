import type { PrismaClient } from '@prisma/client';
import { authPrisma } from './auth-prisma';

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEmptyFarmForUser(ownerUserId: string): Promise<void> {
    await this.prisma.farm.create({ data: { ownerUserId } });
  }

  async findFarmIdForUser(userId: string): Promise<string | null> {
    const farm = await this.prisma.farm.findUnique({
      where: { ownerUserId: userId },
      select: { id: true },
    });

    return farm?.id ?? null;
  }
}

export const authRepository = new AuthRepository(authPrisma);
