import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { authPrisma } from './auth-prisma';

@Injectable()
export class AuthPrismaService implements OnModuleDestroy {
  onModuleDestroy(): Promise<void> {
    return authPrisma.$disconnect();
  }
}
