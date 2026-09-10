import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

describe('chat', () => {
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

  it('streams and persists a complete UI message conversation', async () => {
    testApp.model.script({ text: 'Olá, João. Como posso ajudar?' });

    const chatId = 'chat-nova-conversa';
    const message = {
      id: 'message-pergunta',
      role: 'user',
      parts: [{ type: 'text', text: 'Olá' }],
    };

    const response = await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: chatId, message })
      .expect(200)
      .expect('content-type', /text\/event-stream/);

    expect(response.text).toContain('Olá, João. Como posso ajudar?');

    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${chatId}`)
      .expect(200);
    const messages = history.body as unknown as UIMessage[];

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(message);
    expect(messages[1]?.role).toBe('assistant');
    expect(messages[1]?.id).toMatch(/^msg-/);
    expect(messages[1]?.parts).toEqual([
      { type: 'step-start' },
      { type: 'text', text: 'Olá, João. Como posso ajudar?', state: 'done' },
    ]);
  });

  it('returns frozen stored tool results without calling the model', async () => {
    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${SEED_IDS.chats.primeiraConversa}`)
      .expect(200);
    const messages = history.body as unknown as UIMessage[];

    expect(messages[1]?.parts).toContainEqual({
      type: 'tool-getFinancialSummary',
      toolCallId: 'seed-tool-call-1',
      state: 'output-available',
      input: { from: '2026-03-01', to: '2026-03-31' },
      output: {
        totalExpenses: 46800,
        totalRevenues: 117900,
        result: 71100,
      },
    });
    expect(testApp.model.calls).toHaveLength(0);
  });

  it('does not expose a chat from another farm', async () => {
    await testApp
      .as(SEED_IDS.users.marina)
      .get(`/chats/${SEED_IDS.chats.primeiraConversa}`)
      .expect(404);
  });

  it('validates the message payload before starting a stream', async () => {
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: '', message: { id: '', role: 'assistant', parts: [] } })
      .expect(400);
  });
});
import type { UIMessage } from 'ai';
