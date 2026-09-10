import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileNotFoundError } from './errors/profile-not-found.error';
import { ProfileRepository } from './profile.repository';

export type UpdateProfileInput = UpdateProfileDto;

@Injectable()
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async get(userId: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) throw new ProfileNotFoundError();
    return profile;
  }

  async update(userId: string, input: UpdateProfileInput) {
    return this.repository.update(userId, input);
  }
}
