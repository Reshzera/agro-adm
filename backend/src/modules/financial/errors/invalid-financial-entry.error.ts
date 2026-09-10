import { BadRequestException } from '@nestjs/common';

export class InvalidFinancialEntryError extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
