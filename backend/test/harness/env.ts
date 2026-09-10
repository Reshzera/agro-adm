import { resolveTestDatabaseUrl } from './database';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.OPENAI_API_KEY = 'test-nao-usa-token';
