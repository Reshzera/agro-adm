import { NotFoundException } from '@nestjs/common';

export class AttentionItemNotFoundError extends NotFoundException {
  constructor() {
    super('Attention item not found.');
  }
}
