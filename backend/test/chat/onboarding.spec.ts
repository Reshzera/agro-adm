import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

type FarmResponse = {
  agentContext: string | null;
  primaryActivity: string | null;
};

describe('conversational onboarding', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await testApp.reseed();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('tells the agent to ask one missing field at a time without inventing', async () => {
    testApp.repositories.farm.updateForAgent(SEED_IDS.farms.santaClara, {
      name: null,
      totalAreaHa: null,
      primaryActivity: null,
      location: null,
      onboardingCompleted: false,
    });
    testApp.model.script({ text: 'Como se chama sua fazenda?' });
    testApp.titleModel.script({ text: 'Cadastro da fazenda' });

    const response = await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: 'chat-onboarding-question',
        message: {
          id: 'message-onboarding-start',
          role: 'user',
          parts: [{ type: 'text', text: 'Quero começar' }],
        },
      })
      .expect(200);

    expect(response.text).toContain('Como se chama sua fazenda?');
    const call = testApp.model.calls[0];
    const prompt = JSON.stringify(call?.prompt);
    expect(prompt).toContain('somente uma pergunta por resposta');
    expect(prompt).toContain('Nunca invente respostas');
    expect(prompt).toContain('nome, área total aproximada, localização');
  });

  it('stores structured data and completes onboarding through updateFarm', async () => {
    testApp.repositories.farm.updateForAgent(SEED_IDS.farms.santaClara, {
      name: null,
      totalAreaHa: null,
      primaryActivity: null,
      location: null,
      onboardingCompleted: false,
    });
    testApp.model.script({
      toolCalls: [
        {
          toolName: 'updateFarm',
          input: {
            name: 'Fazenda Ipê',
            totalAreaHa: '230.00',
            location: 'Sidrolândia, MS',
            primaryActivity: 'Mista',
            mainCrops: 'Soja e milho',
            approximateAnimalCount: 180,
          },
        },
      ],
    });
    testApp.titleModel.script({ text: 'Cadastro da Fazenda Ipê' });

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: 'chat-onboarding-data',
        message: {
          id: 'message-onboarding-data',
          role: 'user',
          parts: [{ type: 'text', text: 'Estes são os dados da propriedade' }],
        },
      })
      .expect(200);

    const farm = await testApp
      .as(SEED_IDS.users.joao)
      .get('/farms')
      .expect(200);
    expect(farm.body).toEqual(
      expect.objectContaining({
        name: 'Fazenda Ipê',
        totalAreaHa: '230.00',
        location: 'Sidrolândia, MS',
        primaryActivity: 'Mista',
        mainCrops: 'Soja e milho',
        approximateAnimalCount: 180,
        onboardingCompleted: true,
      }),
    );
  });

  it('keeps qualitative information in agentContext and stops onboarding questions once complete', async () => {
    testApp.model.script({
      toolCalls: [
        {
          toolName: 'updateFarmContext',
          input: {
            previousContext: 'João é o gerente.',
            context: 'João é o gerente.\n\n- O rebanho é da raça Nelore.',
          },
        },
      ],
    });
    testApp.titleModel.script({ text: 'Contexto do rebanho' });

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: 'chat-complete-farm',
        message: {
          id: 'message-complete-farm',
          role: 'user',
          parts: [{ type: 'text', text: 'Nosso rebanho é Nelore.' }],
        },
      })
      .expect(200);

    const prompt = JSON.stringify(testApp.model.calls[0]?.prompt);
    expect(prompt).toContain('O onboarding já está concluído');
    expect(prompt).toContain('Não faça perguntas de cadastro');

    const farm = await testApp
      .as(SEED_IDS.users.joao)
      .get('/farms')
      .expect(200);
    const body = farm.body as FarmResponse;
    expect(body.agentContext).toContain('raça Nelore');
    expect(body.primaryActivity).toBe('Pecuária de corte');
  });
});
