import { NotFoundException } from '@nestjs/common';

export class ChatNotFoundError extends NotFoundException {
  constructor() {
    super('Chat not found.');
  }
}
