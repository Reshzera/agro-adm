import { BadRequestException } from '@nestjs/common';

export class InvalidFarmUpdateError extends BadRequestException {
  constructor() {
    super('At least one valid farm field must be provided.');
  }
}
