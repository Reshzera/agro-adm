import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

// Better Auth creates this Prisma client while Nest is loading module metadata,
// which happens before ConfigModule.forRoot() runs. Load either supported env
// location before reading DATABASE_URL for the adapter.
loadEnv({
  path: [
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '.env'),
  ],
  quiet: true,
});

export const authPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
