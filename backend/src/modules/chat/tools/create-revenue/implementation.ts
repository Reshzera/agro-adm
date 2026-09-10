import { EntrySource } from '@prisma/client';
import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolveDate, serialize } from '../utils';
import { createRevenueRegistry } from './registry';

export async function createRevenue(
  context: ToolContext,
  input: z.infer<typeof createRevenueRegistry.inputSchema>,
) {
  return serialize(
    await context.financial.createRevenue(context.farmId, {
      ...input,
      date: resolveDate(input.date, context.now),
      source: EntrySource.WEB_AGENT,
    }),
  );
}
