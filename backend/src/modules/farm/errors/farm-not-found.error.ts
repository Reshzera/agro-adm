import { NotFoundException } from '@nestjs/common';

export class FarmNotFoundError extends NotFoundException {
  constructor() {
    super('Farm not found.');
  }
}
