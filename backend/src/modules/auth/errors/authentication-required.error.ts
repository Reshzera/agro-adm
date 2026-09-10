import { UnauthorizedException } from '@nestjs/common';

export class AuthenticationRequiredError extends UnauthorizedException {
  constructor() {
    super('Authentication is required.');
  }
}
