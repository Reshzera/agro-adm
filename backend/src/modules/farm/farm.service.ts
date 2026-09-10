import { Injectable } from '@nestjs/common';
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
}
