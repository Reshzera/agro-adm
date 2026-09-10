import type { UIMessage } from 'ai';
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
    testApp.titleModel.script({ text: 'Primeiros passos na fazenda' });

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

    const list = await testApp
      .as(SEED_IDS.users.joao)
      .get('/chats')
      .expect(200);
    expect(list.body).toContainEqual(
      expect.objectContaining({
        id: chatId,
        title: 'Primeiros passos na fazenda',
        source: 'WEB',
      }),
    );
  });

  it('lists recent chats and supports creating, renaming and archiving', async () => {
    const initial = await testApp
      .as(SEED_IDS.users.joao)
      .get('/chats')
      .expect(200);
    expect(initial.body).toEqual([
      expect.objectContaining({
        id: SEED_IDS.chats.primeiraConversa,
        title: 'Gastos de março',
        source: 'WEB',
      }),
    ]);

    const created = await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats/new')
      .expect(201);
    const chatId = (created.body as { id: string }).id;

    await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/chats/${chatId}`)
      .send({ title: 'Planejamento da safra' })
      .expect(204);

    await testApp
      .as(SEED_IDS.users.joao)
      .delete(`/chats/${chatId}`)
      .expect(204);

    await testApp.as(SEED_IDS.users.joao).get(`/chats/${chatId}`).expect(404);
  });

  it('does not list, rename or archive chats from another farm', async () => {
    const list = await testApp
      .as(SEED_IDS.users.marina)
      .get('/chats')
      .expect(200);
    expect(list.body).toEqual([]);

    await testApp
      .as(SEED_IDS.users.marina)
      .patch(`/chats/${SEED_IDS.chats.primeiraConversa}`)
      .send({ title: 'Intrusão' })
      .expect(404);
    await testApp
      .as(SEED_IDS.users.marina)
      .delete(`/chats/${SEED_IDS.chats.primeiraConversa}`)
      .expect(404);
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

  it('accepts an assistant message when automatically continuing after a tool result', async () => {
    testApp.model.script({ text: 'Posso ajudar com mais alguma coisa?' });
    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${SEED_IDS.chats.primeiraConversa}`)
      .expect(200);
    const messages = history.body as unknown as UIMessage[];

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: SEED_IDS.chats.primeiraConversa,
        message: messages[1],
      })
      .expect(200);
  });

  it('validates the message payload before starting a stream', async () => {
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: '', message: { id: '', role: 'assistant', parts: [] } })
      .expect(400);
  });
});
