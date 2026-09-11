import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
  constructor(private readonly db: DatabaseService) {}

  findByUserId(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: profileSelection,
    });
  }

  update(userId: string, input: UpdateProfileInput) {
    return this.db.client.user.update({
      where: { id: userId },
      data: {
        ...input,
        ...(input.email !== undefined ? { emailVerified: false } : {}),
      },
      select: profileSelection,
    });
  }
}
