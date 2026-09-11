import { NotFoundException } from '@nestjs/common';

export class CattleResourceNotFoundError extends NotFoundException {
  constructor(resource: 'Lot' | 'Paddock') {
    super(`${resource} not found.`);
  }
}
