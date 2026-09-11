import type { UIMessage } from 'ai';
import { AGENT_MAX_STEPS } from '../../src/modules/chat/agent-loop';
import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

type ToolPart = {
  type: string;
  state: string;
  approval?: { id: string; approved?: boolean };
};

function assistantOf(messages: UIMessage[]): UIMessage {
  const assistant = messages.find((message) => message.role === 'assistant');
  if (!assistant) throw new Error('A conversa não tem resposta do assistente.');
  return assistant;
}

describe('agent loop', () => {
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

  it('calls a tool and answers from its result within a single request', async () => {
    testApp.model.script(
      { toolCalls: [{ toolName: 'getFarm', input: {} }] },
      { text: 'Sua fazenda tem 840 hectares.' },
    );
    testApp.titleModel.script({ text: 'Tamanho da fazenda' });

    const chatId = 'chat-uma-volta-so';
    const response = await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: chatId,
        message: {
          id: 'message-tamanho',
          role: 'user',
          parts: [{ type: 'text', text: 'qual o tamanho da fazenda?' }],
        },
      })
      .expect(200);

    expect(response.text).toContain('Sua fazenda tem 840 hectares.');
    expect(testApp.model.calls).toHaveLength(2);
    expect(JSON.stringify(testApp.model.calls[1]?.prompt)).toContain(
      'Fazenda Santa Clara',
    );

    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${chatId}`)
      .expect(200);
    const messages = history.body as unknown as UIMessage[];
    const assistant = assistantOf(messages);
    const parts = assistant.parts as unknown as ToolPart[];

    expect(parts).toContainEqual(
      expect.objectContaining({
        type: 'tool-getFarm',
        state: 'output-available',
      }),
    );
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: 'Sua fazenda tem 840 hectares.',
      }),
    );
  });

  it('stops the loop at the shared step limit instead of running forever', async () => {
    testApp.model.script(
      ...Array.from({ length: AGENT_MAX_STEPS + 2 }, () => ({
        toolCalls: [{ toolName: 'getFarm', input: {} }],
      })),
    );
    testApp.titleModel.script({ text: 'Consulta repetida' });

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: 'chat-limite-de-passos',
        message: {
          id: 'message-limite',
          role: 'user',
          parts: [{ type: 'text', text: 'me conta tudo da fazenda' }],
        },
      })
      .expect(200);

    expect(testApp.model.calls).toHaveLength(AGENT_MAX_STEPS);
  });

  it('pauses at the approval request and deletes the expense once the producer approves', async () => {
    testApp.model.script({
      toolCalls: [
        {
          toolName: 'deleteExpense',
          input: { id: SEED_IDS.expenses.diesel },
          toolCallId: 'call-apaga-diesel',
        },
      ],
    });
    testApp.titleModel.script({ text: 'Exclusão do diesel' });

    const chatId = 'chat-aprovacao-exclusao';
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({
        id: chatId,
        message: {
          id: 'message-apaga-diesel',
          role: 'user',
          parts: [{ type: 'text', text: 'apaga a despesa do diesel' }],
        },
      })
      .expect(200);

    expect(testApp.model.calls).toHaveLength(1);
    expect(testApp.repositories.financial.deleteExpense).not.toHaveBeenCalled();

    const history = await testApp
      .as(SEED_IDS.users.joao)
      .get(`/chats/${chatId}`)
      .expect(200);
    const messages = history.body as unknown as UIMessage[];
    const pending = assistantOf(messages);
    const requested = (pending.parts as unknown as ToolPart[]).find(
      (part) => part.type === 'tool-deleteExpense',
    );
    expect(requested?.state).toBe('approval-requested');

    testApp.model.script({ text: 'Pronto, a despesa do diesel foi excluída.' });
    const approved = {
      ...pending,
      parts: (pending.parts as unknown as ToolPart[]).map((part) =>
        part.type === 'tool-deleteExpense'
          ? {
              ...part,
              state: 'approval-responded',
              approval: { ...part.approval, approved: true },
            }
          : part,
      ),
    };

    const response = await testApp
      .as(SEED_IDS.users.joao)
      .post('/chats')
      .send({ id: chatId, message: approved })
      .expect(200);

    expect(response.text).toContain('a despesa do diesel foi excluída');
    expect(testApp.repositories.financial.deleteExpense).toHaveBeenCalledWith(
      SEED_IDS.farms.santaClara,
      SEED_IDS.expenses.diesel,
    );
  });
});
