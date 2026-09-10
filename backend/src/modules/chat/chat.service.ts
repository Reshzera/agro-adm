import { Injectable } from '@nestjs/common';
import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  validateUIMessages,
  type UIMessage,
} from 'ai';
import { AiService } from '../ai/ai.service';
import { FinancialService } from '../financial/financial.service';
import { FarmService } from '../farm/farm.service';
import { chatTools } from './tools';
import {
  ChatRepository,
  type FarmAgentContext,
  type StoredUiMessage,
} from './chat.repository';
import { ChatNotFoundError } from './errors/chat-not-found.error';
import { PostChatDto } from './dto/post-chat.dto';

export type ChatInput = PostChatDto;

function systemPrompt(farm: FarmAgentContext, now: Date): string {
  const areas = farm.areas
    .map((area) => `- ${area.id}: ${area.name} (${area.type})`)
    .join('\n');

  return [
    'Você é o assistente da agro-adm para gestão de uma propriedade rural.',
    'Seja claro, objetivo e não invente dados. Para números atualizados, use ferramentas quando elas estiverem disponíveis.',
    'Antes de criar uma despesa ou receita, apresente e obtenha confirmação do entendimento (valor, data, descrição, categoria e rateio quando houver). Só então use a tool de criação.',
    `Data atual: ${now.toISOString().slice(0, 10)}.`,
    `Fazenda: ${farm.name ?? 'sem nome'}.`,
    `Área total: ${farm.totalAreaHa?.toString() ?? 'não informada'} ha.`,
    `Atividade principal: ${farm.primaryActivity ?? 'não informada'}.`,
    `Onboarding concluído: ${farm.onboardingCompleted ? 'sim' : 'não'}.`,
    `Contexto do produtor:\n${farm.agentContext ?? 'não informado'}`,
    `Áreas cadastradas (id, nome e tipo):\n${areas || 'nenhuma'}`,
  ].join('\n\n');
}

function toStoredMessage(message: UIMessage): StoredUiMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts as unknown as StoredUiMessage['parts'],
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly ai: AiService,
    private readonly financial: FinancialService,
    private readonly farms: FarmService,
  ) {}

  async history(farmId: string, chatId: string): Promise<UIMessage[]> {
    const chat = await this.repository.findForFarm(chatId, farmId);
    if (!chat) throw new ChatNotFoundError();
    return chat.messages as UIMessage[];
  }

  async stream(farmId: string, input: ChatInput) {
    let chat = await this.repository.findForFarm(input.id, farmId);
    if (!chat) chat = await this.repository.create(input.id, farmId);

    const messages = [
      ...(chat.messages as UIMessage[]).filter(
        (message) => message.id !== input.message.id,
      ),
      input.message as unknown as UIMessage,
    ];
    const validatedMessages = await validateUIMessages({ messages });
    const farm = await this.repository.farmAgentContext(farmId);
    if (!farm) throw new ChatNotFoundError();

    const result = streamText({
      model: this.ai.model,
      system: systemPrompt(farm, this.ai.now()),
      messages: await convertToModelMessages(validatedMessages),
      tools: chatTools(farmId, this.ai.now(), this.financial, this.farms),
    });

    return result.toUIMessageStream({
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
      onFinish: async ({ messages: completeMessages }) => {
        await this.repository.replaceMessages(
          chat.id,
          completeMessages.map(toStoredMessage),
        );
      },
    });
  }
}
