import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticationRequiredError } from './errors/authentication-required.error';
import { FarmContextService } from './farm-context.service';

const TEST_USER_HEADER = 'x-test-user-id';

export type RequestWithFarmContext = Request & {
  farmId?: string;
  user?: { id: string };
};

@Injectable()
export class FarmContextGuard implements CanActivate {
  constructor(private readonly farmContext: FarmContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithFarmContext>();
    const userId =
      request.user?.id ??
      (process.env.NODE_ENV === 'test'
        ? request.header(TEST_USER_HEADER)
        : undefined);

    if (!userId) throw new AuthenticationRequiredError();
    if (!request.user) request.user = { id: userId };
    request.farmId = await this.farmContext.farmIdForUser(userId);
    return true;
  }
}
