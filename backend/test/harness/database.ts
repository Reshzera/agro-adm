import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

const ROOT_ENV = path.resolve(__dirname, '../../../.env');

export function resolveTestDatabaseUrl(): string {
  loadEnv({ path: ROOT_ENV, quiet: true });

  const developmentUrl = process.env.DATABASE_URL;
  if (!developmentUrl) {
    throw new Error(
      'DATABASE_URL não definida. Copie .env.example para .env na raiz do repositório.',
    );
  }

  const configured = process.env.TEST_DATABASE_URL;
  if (configured) {
    if (configured === developmentUrl) {
      throw new Error(
        'TEST_DATABASE_URL é igual à DATABASE_URL. A suíte apaga o banco a cada teste — aponte para outro.',
      );
    }
    return configured;
  }

  const url = new URL(developmentUrl);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}

export async function ensureTestDatabase(databaseUrl: string): Promise<void> {
  const target = new URL(databaseUrl);
  const name = decodeURIComponent(target.pathname.slice(1));

  const maintenance = new URL(databaseUrl);
  maintenance.pathname = '/postgres';
  maintenance.search = '';

  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
}
