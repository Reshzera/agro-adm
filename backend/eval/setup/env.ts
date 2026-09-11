import { config } from 'dotenv';

config({ path: ['../.env', '.env'], quiet: true });

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'yarn eval roda contra o modelo real: defina OPENAI_API_KEY no .env da raiz.',
  );
}
