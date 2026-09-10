import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const DEFAULT_MODEL_ID = 'gpt-5';

@Injectable()
export class AiService {
  readonly model: LanguageModel;

  constructor(config: ConfigService) {
    const openai = createOpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY'),
    });
    this.model = openai(config.get<string>('MODEL_ID') ?? DEFAULT_MODEL_ID);
  }

  now(): Date {
    return new Date();
  }
}
