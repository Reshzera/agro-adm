import { NotFoundException } from '@nestjs/common';

export class FinancialEntryNotFoundError extends NotFoundException {
  constructor() {
    super('Financial entry not found.');
  }
}
