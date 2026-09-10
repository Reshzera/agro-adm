import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ensureTestDatabase, resolveTestDatabaseUrl } from './database';

const BACKEND_ROOT = path.resolve(__dirname, '../..');

export default async function globalSetup(): Promise<void> {
  const databaseUrl = resolveTestDatabaseUrl();
  await ensureTestDatabase(databaseUrl);

  execFileSync(
    path.join(BACKEND_ROOT, 'node_modules', '.bin', 'prisma'),
    ['migrate', 'deploy'],
    {
      cwd: BACKEND_ROOT,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    },
  );
}
