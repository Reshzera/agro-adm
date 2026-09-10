import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { UpdateProfileInput } from './profile.service';

const profileSelection = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  phone: true,
} as const;

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelection,
    });
  }

  update(userId: string, input: UpdateProfileInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...input,
        ...(input.email !== undefined ? { emailVerified: false } : {}),
      },
      select: profileSelection,
    });
  }
}
