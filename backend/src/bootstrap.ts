import type { NestApplicationOptions } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

export const APPLICATION_OPTIONS: NestApplicationOptions = {
  bodyParser: false,
};

export function configureApp(app: NestExpressApplication): void {
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
}
