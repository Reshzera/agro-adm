import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type StoredUiMessage = {
  id: string;
  role: string;
  parts: Prisma.InputJsonValue;
};

export type ChatWithMessages = {
  id: string;
  messages: StoredUiMessage[];
};

export type FarmAgentContext = {
  name: string | null;
  totalAreaHa: { toString(): string } | null;
  primaryActivity: string | null;
  agentContext: string | null;
  onboardingCompleted: boolean;
  areas: Array<{ id: string; name: string; type: string }>;
};

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForFarm(
    chatId: string,
    farmId: string,
  ): Promise<ChatWithMessages | null> {
    return this.prisma.chat.findFirst({
      where: { id: chatId, farmId },
      select: {
        id: true,
        messages: {
          select: { id: true, role: true, parts: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as unknown as Promise<ChatWithMessages | null>;
  }

  create(chatId: string, farmId: string): Promise<ChatWithMessages> {
    return this.prisma.chat.create({
      data: { id: chatId, farmId },
      select: { id: true, messages: true },
    }) as unknown as Promise<ChatWithMessages>;
  }

  async replaceMessages(
    chatId: string,
    messages: StoredUiMessage[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { chatId } }),
      this.prisma.message.createMany({
        data: messages.map((message) => ({ ...message, chatId })),
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
        agentContext: true,
        onboardingCompleted: true,
        areas: { select: { id: true, name: true, type: true } },
      },
    });
  }
}
