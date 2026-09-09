import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false é exigência do BetterAuth (ticket 04) e do webhook do
  // WhatsApp (fatia seguinte, precisa do corpo bruto). Consequência: nenhuma
  // rota parseia JSON até o ticket 04 registrar express.json() para tudo que
  // não for o prefixo do BetterAuth. Até lá, só GET se comporta como esperado.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Nada no código pode assumir mesma origem entre SPA e backend — em
  // desenvolvimento são portas diferentes, em produção serão subdomínios irmãos.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
