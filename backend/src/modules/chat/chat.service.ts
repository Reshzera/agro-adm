import { Injectable } from '@nestjs/common';
import {
  convertToModelMessages,
  createIdGenerator,
  generateText,
  streamText,
  validateUIMessages,
  type UIMessage,
} from 'ai';
import { randomUUID } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { FinancialService } from '../financial/financial.service';
import { FarmService } from '../farm/farm.service';
import { chatTools } from './tools';
import {
  ChatRepository,
  type FarmAgentContext,
  type MessageToStore,
  type StoredMessage,
} from './chat.repository';
import { ChatNotFoundError } from './errors/chat-not-found.error';
import { PostChatDto } from './dto/post-chat.dto';

export type ChatInput = PostChatDto;

function fallbackTitle(messages: UIMessage[]): string {
  const text = messages
    .flatMap((message) => message.parts)
    .find((part) => part.type === 'text')?.text;
  if (!text) return 'Nova conversa';
  return text.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function titleContext(messages: UIMessage[]): string {
  return messages
    .flatMap((message) =>
      message.parts
        .filter((part) => part.type === 'text')
        .map((part) => `${message.role}: ${part.text}`),
    )
    .join('\n')
    .slice(0, 1600);
}

export function systemPrompt(farm: FarmAgentContext, now: Date): string {
  const areas = farm.areas
    .map((area) => `- ${area.id}: ${area.name} (${area.type})`)
    .join('\n');

  const onboarding = farm.onboardingCompleted
    ? [
        'O onboarding já está concluído. Não faça perguntas de cadastro da fazenda espontaneamente; responda ao pedido atual do produtor.',
      ]
    : [
        'O onboarding ainda não foi concluído. Conduza-o como uma conversa acolhedora, fazendo somente uma pergunta por resposta.',
        'Nunca invente respostas. Priorize, nesta ordem, os campos essenciais que ainda estiverem ausentes: nome, área total aproximada, localização e atividade principal (pecuária, agricultura ou mista).',
        'Assim que o produtor informar um dado estruturado, grave-o com updateFarm na mesma resposta, antes de fazer a próxima pergunta. Nunca apenas confirme o dado por texto e siga adiante: o que não passa pela tool se perde.',
        'Culturas principais e quantidade aproximada de animais também são estruturadas, mas pergunte apenas quando forem aplicáveis à atividade informada.',
        'Informações qualitativas extras, como raça do rebanho, pessoas, rotinas e preferências, pertencem ao agentContext e devem ser gravadas com updateFarmContext, preservando o contexto anterior.',
        'O sistema marca o onboarding como concluído quando os quatro campos essenciais estão preenchidos. Quando a tool devolver onboardingCompleted=true, pare o roteiro de cadastro e não faça mais perguntas de onboarding.',
      ];

  return [
    'Você é o assistente da agro-adm para gestão de uma propriedade rural.',
    'Seja claro, objetivo e não invente dados. Para números atualizados, use ferramentas quando elas estiverem disponíveis.',
    'Antes de criar uma despesa ou receita, apresente e obtenha confirmação do entendimento (valor, data, descrição, categoria e rateio quando houver). Só então use a tool de criação.',
    `Data atual: ${now.toISOString().slice(0, 10)}.`,
    `Fazenda: ${farm.name ?? 'sem nome'}.`,
    `Área total: ${farm.totalAreaHa?.toString() ?? 'não informada'} ha.`,
    `Atividade principal: ${farm.primaryActivity ?? 'não informada'}.`,
    `Localização: ${farm.location ?? 'não informada'}.`,
    `Culturas principais: ${farm.mainCrops ?? 'não informadas'}.`,
    `Quantidade aproximada de animais: ${farm.approximateAnimalCount ?? 'não informada'}.`,
    `Onboarding concluído: ${farm.onboardingCompleted ? 'sim' : 'não'}.`,
    `Contexto do produtor:\n${farm.agentContext ?? 'não informado'}`,
    `Áreas cadastradas (id, nome e tipo):\n${areas || 'nenhuma'}`,
    ...onboarding,
  ].join('\n\n');
}

function toMessageToStore(message: UIMessage): MessageToStore {
  return { id: message.id, role: message.role, parts: message.parts };
}

function readStoredMessages(messages: StoredMessage[]): Promise<UIMessage[]> {
  return validateUIMessages({ messages });
}

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly ai: AiService,
    private readonly financial: FinancialService,
    private readonly farms: FarmService,
  ) {}

  list(farmId: string) {
    return this.repository.listForFarm(farmId);
  }

  create(farmId: string) {
    return this.repository.create(randomUUID(), farmId);
  }

  async rename(farmId: string, chatId: string, title: string) {
    const renamed = await this.repository.rename(chatId, farmId, title.trim());
    if (!renamed) throw new ChatNotFoundError();
  }

  async archive(farmId: string, chatId: string) {
    const archived = await this.repository.archive(chatId, farmId);
    if (!archived) throw new ChatNotFoundError();
  }

  async history(farmId: string, chatId: string): Promise<UIMessage[]> {
    const chat = await this.repository.findForFarm(chatId, farmId);
    if (!chat) throw new ChatNotFoundError();
    return readStoredMessages(chat.messages);
  }

  async stream(farmId: string, input: ChatInput) {
    let chat = await this.repository.findForFarm(input.id, farmId);
    if (!chat) chat = await this.repository.create(input.id, farmId);

    const messages = await validateUIMessages({
      messages: [
        ...chat.messages.filter((message) => message.id !== input.message.id),
        input.message,
      ],
    });
    const farm = await this.repository.farmAgentContext(farmId);
    if (!farm) throw new ChatNotFoundError();

    const result = streamText({
      model: this.ai.model,
      system: systemPrompt(farm, this.ai.now()),
      messages: await convertToModelMessages(messages),
      tools: chatTools(farmId, this.ai.now(), this.financial, this.farms),
    });

    return result.toUIMessageStream({
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
      onFinish: async ({ messages: completeMessages }) => {
        await this.repository.replaceMessages(
          chat.id,
          completeMessages.map(toMessageToStore),
        );
        if (chat.title === null) {
          let title = fallbackTitle(completeMessages);
          try {
            const generated = await generateText({
              model: this.ai.titleModel,
              system:
                'Crie um título curto, específico e sem aspas para esta conversa rural. Responda somente com o título, em no máximo 6 palavras.',
              prompt: titleContext(completeMessages),
              maxOutputTokens: 40,
            });
            title =
              generated.text
                .trim()
                .replace(/^["']|["']$/g, '')
                .slice(0, 80) || title;
          } catch {
            // A conversa não deve falhar caso o modelo auxiliar esteja indisponível.
          }
          await this.repository.setGeneratedTitle(chat.id, title);
        }
      },
    });
  }
}
