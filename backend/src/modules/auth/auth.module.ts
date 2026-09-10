import { Global, Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule } from '../database/database.module';
import { auth } from './auth';
import { AuthPrismaService } from './auth-prisma.service';
import { AuthRepository, authRepository } from './auth.repository';
import { FarmContextGuard } from './farm-context.guard';
import { FarmContextService } from './farm-context.service';

@Global()
@Module({
  imports: [
    DatabaseModule,
    BetterAuthModule.forRoot({
      auth,
      disableGlobalAuthGuard: process.env.NODE_ENV === 'test',
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { extended: true, limit: '2mb' },
      },
    }),
  ],
  providers: [
    AuthPrismaService,
    { provide: AuthRepository, useValue: authRepository },
    FarmContextGuard,
    FarmContextService,
  ],
  exports: [AuthRepository, FarmContextGuard, FarmContextService],
})
export class AuthModule {}
