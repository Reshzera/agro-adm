import {
  generateText,
  jsonSchema,
  streamText,
  tool,
  type LanguageModel,
} from 'ai';
import { AiService } from '../../src/modules/ai/ai.service';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import { TEST_USER_HEADER, credentialsFor } from '../test-setups/auth';
import { createTestApp, type TestApp } from '../test-setups/test-app';

const registrarDespesa = tool({
  description:
    'Tool de mentira, existe só para o roteiro ter contra o que casar.',
  inputSchema: jsonSchema<{ valor: number }>({
    type: 'object',
    properties: { valor: { type: 'number' } },
    required: ['valor'],
    additionalProperties: false,
  }),
  execute: (input) => Promise.resolve(input),
});

describe('test harness', () => {
  let testApp: TestApp;
  let model: LanguageModel;

  beforeAll(async () => {
    testApp = await createTestApp();
    model = testApp.app.get(AiService).model;
  });

  beforeEach(async () => {
    await testApp.reseed();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('starts the app with the main configuration and responds to health', async () => {
    await testApp
      .request()
      .get('/health')
      .expect(200, { status: 'ok', service: 'backend' });
  });

  it('freezes the clock at the fixture date', () => {
    expect(testApp.app.get(AiService).now()).toEqual(SEED_CLOCK);
    expect(testApp.now).toEqual(SEED_CLOCK);
  });

  it('replaces the AI service with the scripted model', () => {
    expect((model as { modelId: string }).modelId).toBe('scripted');
  });

  it('emits a scripted tool call', async () => {
    testApp.model.script({
      toolCalls: [{ toolName: 'registrarDespesa', input: { valor: 4800 } }],
    });

    const result = await generateText({
      model,
      prompt: 'gastei 4800 de diesel',
      tools: { registrarDespesa },
    });

    expect(result.toolCalls).toEqual([
      expect.objectContaining({
        toolName: 'registrarDespesa',
        input: { valor: 4800 },
      }),
    ]);
    expect(testApp.model.calls).toHaveLength(1);
  });

  it('streams scripted text', async () => {
    testApp.model.script({ text: 'Em março você gastou R$ 46.800.' });

    const chunks: string[] = [];
    for await (const chunk of streamText({ model, prompt: 'quanto gastei?' })
      .textStream) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Em março você gastou R$ 46.800.');
  });

  it('fails with a clear message when a call is not scripted', async () => {
    await expect(
      generateText({ model, prompt: 'oi', maxRetries: 0 }),
    ).rejects.toThrow(/roteiro/);
  });

  it('authenticates a request as a fixture user', async () => {
    expect(credentialsFor(SEED_IDS.users.joao)).toEqual({
      [TEST_USER_HEADER]: SEED_IDS.users.joao,
    });

    await testApp.as(SEED_IDS.users.joao).get('/health').expect(200);
  });
});
