import { BadRequestException } from '@nestjs/common';

export class InvalidCattleOperationError extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
