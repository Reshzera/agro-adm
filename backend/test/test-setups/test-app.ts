import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { AppModule } from '../../src/app.module';
import { APPLICATION_OPTIONS, configureApp } from '../../src/bootstrap';
import { AiService } from '../../src/modules/ai/ai.service';
import { AuthRepository } from '../../src/modules/auth/auth.repository';
import { ChatRepository } from '../../src/modules/chat/chat.repository';
import { PrismaService } from '../../src/modules/database/prisma.service';
import { FarmRepository } from '../../src/modules/farm/farm.repository';
import { ProfileRepository } from '../../src/modules/profile/profile.repository';
import { SEED_CLOCK } from '../../src/seed/santa-clara';
import { credentialsFor } from './auth';
import {
  createMockRepositories,
  type MockRepositories,
} from './mock-repositories';
import { createScriptedModel, type ScriptedModel } from './scripted-model';

export type TestApp = {
  app: INestApplication;
  repositories: MockRepositories;
  model: ScriptedModel;
  now: Date;
  request(): TestAgent;
  as(userId: string): TestAgent;
  reseed(): Promise<void>;
  close(): Promise<void>;
};

export async function createTestApp(): Promise<TestApp> {
  const model = createScriptedModel();
  const repositories = createMockRepositories();
  const ai: Pick<AiService, 'model' | 'now'> = {
    model: model.model,
    now: () => new Date(SEED_CLOCK),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiService)
    .useValue(ai)
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(AuthRepository)
    .useValue(repositories.auth)
    .overrideProvider(ChatRepository)
    .useValue(repositories.chat)
    .overrideProvider(FarmRepository)
    .useValue(repositories.farm)
    .overrideProvider(ProfileRepository)
    .useValue(repositories.profile)
    .compile();

  const app =
    moduleRef.createNestApplication<NestExpressApplication>(
      APPLICATION_OPTIONS,
    );
  configureApp(app);
  await app.init();

  const testApp: TestApp = {
    app,
    repositories,
    model,
    now: ai.now(),
    request(): TestAgent {
      return request.agent(app.getHttpServer());
    },
    as(userId: string): TestAgent {
      return request.agent(app.getHttpServer()).set(credentialsFor(userId));
    },
    reseed(): Promise<void> {
      model.reset();
      repositories.reset();
      return Promise.resolve();
    },
    async close(): Promise<void> {
      await app.close();
    },
  };

  await testApp.reseed();
  return testApp;
}
