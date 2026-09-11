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
import { CattleRepository } from '../../src/modules/cattle/cattle.repository';
import { DatabaseService } from '../../src/modules/database/database.service';
import { PrismaService } from '../../src/modules/database/prisma.service';
import { FarmRepository } from '../../src/modules/farm/farm.repository';
import { FinancialRepository } from '../../src/modules/financial/financial.repository';
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
  titleModel: ScriptedModel;
  now: Date;
  request(): TestAgent;
  as(userId: string): TestAgent;
  reseed(): Promise<void>;
  close(): Promise<void>;
};

export async function createTestApp(): Promise<TestApp> {
  const model = createScriptedModel();
  const titleModel = createScriptedModel();
  const repositories = createMockRepositories();
  const ai: Pick<AiService, 'model' | 'titleModel' | 'now'> = {
    model: model.model,
    titleModel: titleModel.model,
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
    .overrideProvider(CattleRepository)
    .useValue(repositories.cattle)
    .overrideProvider(DatabaseService)
    .useValue(repositories.database)
    .overrideProvider(FarmRepository)
    .useValue(repositories.farm)
    .overrideProvider(FinancialRepository)
    .useValue(repositories.financial)
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
    titleModel,
    now: ai.now(),
    request(): TestAgent {
      return request.agent(app.getHttpServer());
    },
    as(userId: string): TestAgent {
      return request.agent(app.getHttpServer()).set(credentialsFor(userId));
    },
    reseed(): Promise<void> {
      model.reset();
      titleModel.reset();
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
