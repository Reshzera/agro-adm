import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { resetDatabase, seedSantaClara } from '../src/seed/santa-clara';

loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true });

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await resetDatabase(prisma);
    await seedSantaClara(prisma);
    console.log('Seed aplicado: Fazenda Santa Clara e Fazenda Boa Vista.');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
