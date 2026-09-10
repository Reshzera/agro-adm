import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { AppModule } from '../../src/app.module';
import { APPLICATION_OPTIONS, configureApp } from '../../src/bootstrap';
import { AiService } from '../../src/modules/ai/ai.service';
import { PrismaService } from '../../src/modules/database/prisma.service';
import {
  SEED_CLOCK,
  resetDatabase,
  seedSantaClara,
} from '../../src/seed/santa-clara';
import { credentialsFor } from './auth';
import { createScriptedModel, type ScriptedModel } from './scripted-model';

export type TestApp = {
  app: INestApplication;
  prisma: PrismaService;
  model: ScriptedModel;
  now: Date;
  request(): TestAgent;
  as(userId: string): TestAgent;
  reseed(): Promise<void>;
  close(): Promise<void>;
};

export async function createTestApp(): Promise<TestApp> {
  const model = createScriptedModel();
  const ai: Pick<AiService, 'model' | 'now'> = {
    model: model.model,
    now: () => new Date(SEED_CLOCK),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiService)
    .useValue(ai)
    .compile();

  const app =
    moduleRef.createNestApplication<NestExpressApplication>(
      APPLICATION_OPTIONS,
    );
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);

  const testApp: TestApp = {
    app,
    prisma,
    model,
    now: ai.now(),
    request(): TestAgent {
      return request.agent(app.getHttpServer());
    },
    as(userId: string): TestAgent {
      return request.agent(app.getHttpServer()).set(credentialsFor(userId));
    },
    async reseed(): Promise<void> {
      model.reset();
      await resetDatabase(prisma);
      await seedSantaClara(prisma);
    },
    async close(): Promise<void> {
      await app.close();
    },
  };

  await testApp.reseed();
  return testApp;
}
