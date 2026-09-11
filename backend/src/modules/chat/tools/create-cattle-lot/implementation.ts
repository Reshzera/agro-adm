import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolveDate, serialize } from '../utils';
import { createCattleLotRegistry } from './registry';

export async function createCattleLot(
  context: ToolContext,
  input: z.infer<typeof createCattleLotRegistry.inputSchema>,
) {
  return serialize(
    await context.cattle.createLot(context.farmId, {
      name: input.name,
      category: input.category,
      headCount: input.headCount,
      purpose: input.purpose ?? null,
      startedOn: input.startedOn
        ? resolveDate(input.startedOn, context.now)
        : null,
      notes: input.notes ?? null,
    }),
  );
}
