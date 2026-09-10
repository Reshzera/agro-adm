import { BadRequestException } from '@nestjs/common';

export class InvalidProfileUpdateError extends BadRequestException {
  constructor() {
    super('At least one valid profile field must be provided.');
  }
}
