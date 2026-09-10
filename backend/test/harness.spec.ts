import {
  generateText,
  jsonSchema,
  streamText,
  tool,
  type LanguageModel,
} from 'ai';
import { AiService } from '../src/modules/ai/ai.service';
import { SEED_CLOCK, SEED_IDS } from '../src/seed/santa-clara';
import { TEST_USER_HEADER, credentialsFor } from './harness/auth';
import { createTestApp, type TestApp } from './harness/test-app';

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

describe('harness de teste', () => {
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

  it('sobe a app com a configuração do main.ts e responde no health', async () => {
    await testApp
      .request()
      .get('/health')
      .expect(200, { status: 'ok', service: 'backend' });
  });

  it('roda contra um banco de teste, nunca o de desenvolvimento', async () => {
    const [{ current_database: database }] = await testApp.prisma.$queryRaw<
      { current_database: string }[]
    >`SELECT current_database()`;

    expect(database).toMatch(/_test$/);
  });

  it('semeia a Fazenda Santa Clara com áreas e lançamentos', async () => {
    const farm = await testApp.prisma.farm.findUniqueOrThrow({
      where: { id: SEED_IDS.farms.santaClara },
      include: { areas: true, expenses: { include: { allocations: true } } },
    });

    expect(farm.name).toBe('Fazenda Santa Clara');
    expect(farm.areas.map((area) => area.name).sort()).toEqual([
      'Pasto 4',
      'Sede',
      'Talhão 1',
      'Talhão 2',
    ]);
    for (const expense of farm.expenses) {
      const allocated = expense.allocations.reduce(
        (total, allocation) => total.add(allocation.amount),
        expense.amount.minus(expense.amount),
      );
      expect(allocated.equals(expense.amount)).toBe(true);
    }
  });

  it('apaga dados dentro de um teste', async () => {
    await testApp.prisma.revenue.deleteMany();
    expect(await testApp.prisma.revenue.count()).toBe(0);
  });

  it('recomeça do seed no teste seguinte', async () => {
    expect(await testApp.prisma.revenue.count()).toBe(3);
  });

  it('congela o relógio na data do seed', () => {
    expect(testApp.app.get(AiService).now()).toEqual(SEED_CLOCK);
    expect(testApp.now).toEqual(SEED_CLOCK);
  });

  it('troca o serviço de IA pelo modelo roteirizado', () => {
    expect((model as { modelId: string }).modelId).toBe('scripted');
  });

  it('emite a tool call roteirizada', async () => {
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

  it('entrega texto roteirizado em stream', async () => {
    testApp.model.script({ text: 'Em março você gastou R$ 46.800.' });

    const chunks: string[] = [];
    for await (const chunk of streamText({ model, prompt: 'quanto gastei?' })
      .textStream) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Em março você gastou R$ 46.800.');
  });

  it('falha com mensagem clara quando a chamada não está roteirizada', async () => {
    await expect(
      generateText({ model, prompt: 'oi', maxRetries: 0 }),
    ).rejects.toThrow(/roteiro/);
  });

  it('autentica a requisição como um usuário do seed', async () => {
    expect(credentialsFor(SEED_IDS.users.joao)).toEqual({
      [TEST_USER_HEADER]: SEED_IDS.users.joao,
    });

    await testApp.as(SEED_IDS.users.joao).get('/health').expect(200);
  });
});
