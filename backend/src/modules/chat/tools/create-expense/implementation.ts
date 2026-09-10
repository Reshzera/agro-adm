import { EntrySource } from '@prisma/client';
import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolveDate, serialize } from '../utils';
import { createExpenseRegistry } from './registry';

export async function createExpense(
  context: ToolContext,
  input: z.infer<typeof createExpenseRegistry.inputSchema>,
) {
  return serialize(
    await context.financial.createExpense(context.farmId, {
      ...input,
      date: resolveDate(input.date, context.now),
      source: EntrySource.WEB_AGENT,
    }),
  );
}
