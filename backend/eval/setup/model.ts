import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { LanguageModel } from 'ai';
import { AiService } from '../../src/modules/ai/ai.service';

export type EvalModel = {
  model: LanguageModel;
  modelId: string;
  close(): Promise<void>;
};

export async function createEvalModel(): Promise<EvalModel> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['../.env', '.env'],
      }),
    ],
    providers: [AiService],
  }).compile();

  const model = moduleRef.get(AiService).model;

  return {
    model,
    modelId: typeof model === 'string' ? model : model.modelId,
    close: () => moduleRef.close(),
  };
}
