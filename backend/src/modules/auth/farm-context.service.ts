import { Injectable } from '@nestjs/common';
import { FarmContextNotFoundError } from './errors/farm-context-not-found.error';
import { AuthRepository } from './auth.repository';

@Injectable()
export class FarmContextService {
  constructor(private readonly repository: AuthRepository) {}

  async farmIdForUser(userId: string): Promise<string> {
    const farmId = await this.repository.findFarmIdForUser(userId);
    if (!farmId) throw new FarmContextNotFoundError();
    return farmId;
  }
}
