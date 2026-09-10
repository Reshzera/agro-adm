import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { authPrisma } from './auth-prisma';
import { authRepository } from './auth.repository';

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export const auth = betterAuth({
  appName: 'agro-adm',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  trustedOrigins: [frontendUrl],
  database: prismaAdapter(authPrisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async () => {
      // A entrega de e-mail entra no provedor transacional na fatia de deploy.
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await authRepository.createEmptyFarmForUser(user.id);
        },
      },
    },
  },
});
