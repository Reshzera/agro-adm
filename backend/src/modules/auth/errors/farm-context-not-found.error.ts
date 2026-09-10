import { NotFoundException } from '@nestjs/common';

export class FarmContextNotFoundError extends NotFoundException {
  constructor() {
    super('No farm context was found for the authenticated user.');
  }
}
