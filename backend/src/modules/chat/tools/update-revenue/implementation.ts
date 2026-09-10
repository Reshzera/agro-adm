import { EntrySource } from '@prisma/client';
import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolveDate, serialize } from '../utils';
import { updateRevenueRegistry } from './registry';

export async function updateRevenue(
  context: ToolContext,
  input: z.infer<typeof updateRevenueRegistry.inputSchema>,
) {
  const { date, ...update } = input;
  return serialize(
    await context.financial.updateRevenue(context.farmId, {
      ...update,
      ...(date ? { date: resolveDate(date, context.now) } : {}),
      source: EntrySource.WEB_AGENT,
    }),
  );
}
