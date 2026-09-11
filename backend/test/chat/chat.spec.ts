import type { UIMessage } from 'ai';
import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

const MOVEMENT_CHAT = 'chat-movimento';

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

  function requestMovement() {
    testApp.model.script({
      text: 'Vou preparar a mudança do Lote 12.',
      toolCalls: [
        {
          toolName: 'moveCattleLot',
          input: {
            lotId: SEED_IDS.lots.recria,
            fromPaddockId: SEED_IDS.areas.pasto4,
            toPaddockId: SEED_IDS.areas.pasto6,
            occurredAt: '2026-03-16T12:00:00.000Z',
          },
        },
      ],
    });
    testApp.titleModel.script({ text: 'Mudança de pasto' });

    return testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: MOVEMENT_CHAT,
        message: {
          id: 'message-mover',
          role: 'user',
          parts: [{ type: 'text', text: 'passa o lote 12 pro pasto 6' }],
        },
      })
      .expect(200);
  }

  async function resolveApproval(approved: boolean): Promise<UIMessage> {
    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${MOVEMENT_CHAT}`)
      .expect(200);
    const assistant = (history.body as unknown as UIMessage[])[1];

    return {
      ...assistant,
      parts: assistant.parts.map((part) =>
        part.type === 'tool-moveCattleLot'
          ? {
              ...part,
              state: 'approval-responded',
              approval: { ...part.approval, approved },
            }
          : part,
      ),
    } as UIMessage;
  }

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

  it('returns an empty history for a newly created chat', async () => {
    const created = await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats/new')
      .expect(201);
    const chatId = (created.body as { id: string }).id;

    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${chatId}`)
      .expect(200);

    expect(history.body).toEqual([]);
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

  it('asks the producer to approve a movement before anything is written', async () => {
    const response = await requestMovement();

    expect(response.text).toContain('tool-approval-request');
    expect(testApp.repositories.cattle.listMovements()).toHaveLength(0);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(0);
    expect(
      testApp.repositories.cattle.findOpenOccupancy(SEED_IDS.lots.recria),
    ).toEqual(expect.objectContaining({ paddockId: SEED_IDS.areas.pasto4 }));
  });

  it('runs the approved movement through the same command path as the manual screen', async () => {
    await requestMovement();
    testApp.model.script({ text: 'Pronto: o Lote 12 está no Pasto 6.' });

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: MOVEMENT_CHAT, message: await resolveApproval(true) })
      .expect(200);

    expect(testApp.repositories.cattle.listMovements()).toEqual([
      expect.objectContaining({
        lotId: SEED_IDS.lots.recria,
        fromPaddockId: SEED_IDS.areas.pasto4,
        toPaddockId: SEED_IDS.areas.pasto6,
        headCount: 180,
        actorId: SEED_IDS.users.joao,
        source: 'AGENT',
      }),
    ]);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(1);
    expect(testApp.repositories.cattle.listOutboxMessages()).toHaveLength(1);
    expect(
      testApp.repositories.cattle.findOpenOccupancy(SEED_IDS.lots.recria),
    ).toEqual(expect.objectContaining({ paddockId: SEED_IDS.areas.pasto6 }));
  });

  it('writes nothing at all when the producer declines the movement', async () => {
    await requestMovement();
    testApp.model.script({ text: 'Tudo bem, deixei o lote onde estava.' });

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: MOVEMENT_CHAT, message: await resolveApproval(false) })
      .expect(200);

    expect(testApp.repositories.cattle.listMovements()).toHaveLength(0);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(0);
    expect(testApp.repositories.cattle.listOutboxMessages()).toHaveLength(0);
    expect(testApp.repositories.cattle.listIdempotencyKeys()).toHaveLength(0);
    expect(
      testApp.repositories.cattle.findOpenOccupancy(SEED_IDS.lots.recria),
    ).toEqual(expect.objectContaining({ paddockId: SEED_IDS.areas.pasto4 }));
  });

  it('validates the message payload before starting a stream', async () => {
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: '', message: { id: '', role: 'assistant', parts: [] } })
      .expect(400);
  });
});
