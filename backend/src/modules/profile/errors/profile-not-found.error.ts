import { NotFoundException } from '@nestjs/common';

export class ProfileNotFoundError extends NotFoundException {
  constructor() {
    super('Profile not found.');
  }
}
