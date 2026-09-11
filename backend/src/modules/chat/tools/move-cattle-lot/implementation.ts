import { ActorType, DomainEventSource } from '@prisma/client';
import type { z } from 'zod';
import type { ToolContext } from '../types';
import { moveCattleLotRegistry } from './registry';

export async function moveCattleLot(
  context: ToolContext,
  input: z.infer<typeof moveCattleLotRegistry.inputSchema>,
  toolCallId: string,
) {
  const { movement } = await context.cattle.moveLot(
    context.farmId,
    context.actorId,
    {
      ...input,
      // The approved tool call is the command identity: a retried stream
      // replays the same movement instead of recording a second one.
      idempotencyKey: `chat-${toolCallId}`,
      causationId: toolCallId,
    },
    DomainEventSource.AGENT,
    ActorType.USER,
  );

  return {
    moved: true,
    lot: movement.lot,
    fromPaddock: movement.fromPaddock,
    toPaddock: movement.toPaddock,
    occurredAt: movement.occurredAt,
  };
}
