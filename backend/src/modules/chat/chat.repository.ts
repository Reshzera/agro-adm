import { Injectable } from '@nestjs/common';
import { ChatSource, type Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type StoredMessage = {
  id: string;
  role: string;
  parts: Prisma.JsonValue;
};

export type MessageToStore = {
  id: string;
  role: string;
  parts: unknown;
};

export type ChatWithMessages = {
  id: string;
  title: string | null;
  messages: StoredMessage[];
};

export type ChatSummary = {
  id: string;
  title: string | null;
  source: ChatSource;
  updatedAt: Date;
};

export type FarmAgentContext = {
  name: string | null;
  totalAreaHa: { toString(): string } | null;
  primaryActivity: string | null;
  location: string | null;
  mainCrops: string | null;
  approximateAnimalCount: number | null;
  agentContext: string | null;
  onboardingCompleted: boolean;
  areas: Array<{ id: string; name: string; type: string }>;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForFarm(farmId: string): Promise<ChatSummary[]> {
    return this.prisma.chat.findMany({
      where: { farmId, archivedAt: null },
      select: { id: true, title: true, source: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findForFarm(
    chatId: string,
    farmId: string,
  ): Promise<ChatWithMessages | null> {
    return this.prisma.chat.findFirst({
      where: { id: chatId, farmId, archivedAt: null },
      select: {
        id: true,
        title: true,
        messages: {
          select: { id: true, role: true, parts: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  create(chatId: string, farmId: string): Promise<ChatWithMessages> {
    return this.prisma.chat.create({
      data: { id: chatId, farmId, source: ChatSource.WEB },
      select: {
        id: true,
        title: true,
        messages: { select: { id: true, role: true, parts: true } },
      },
    });
  }

  async rename(
    chatId: string,
    farmId: string,
    title: string,
  ): Promise<boolean> {
    const result = await this.prisma.chat.updateMany({
      where: { id: chatId, farmId, archivedAt: null },
      data: { title },
    });
    return result.count === 1;
  }

  async archive(chatId: string, farmId: string): Promise<boolean> {
    const result = await this.prisma.chat.updateMany({
      where: { id: chatId, farmId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count === 1;
  }

  setGeneratedTitle(chatId: string, title: string): Promise<unknown> {
    return this.prisma.chat.updateMany({
      where: { id: chatId, title: null, archivedAt: null },
      data: { title },
    });
  }

  async replaceMessages(
    chatId: string,
    messages: MessageToStore[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { chatId } }),
      this.prisma.message.createMany({
        data: messages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: toJsonValue(message.parts),
          chatId,
        })),
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  farmAgentContext(farmId: string): Promise<FarmAgentContext | null> {
    return this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        name: true,
        totalAreaHa: true,
        primaryActivity: true,
        location: true,
        mainCrops: true,
        approximateAnimalCount: true,
        agentContext: true,
        onboardingCompleted: true,
        areas: { select: { id: true, name: true, type: true } },
      },
    });
  }
}
