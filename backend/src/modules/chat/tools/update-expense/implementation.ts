import { EntrySource } from '@prisma/client';
import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolveDate, serialize } from '../utils';
import { updateExpenseRegistry } from './registry';

export async function updateExpense(
  context: ToolContext,
  input: z.infer<typeof updateExpenseRegistry.inputSchema>,
) {
  const { date, ...update } = input;
  return serialize(
    await context.financial.updateExpense(context.farmId, {
      ...update,
      ...(date ? { date: resolveDate(date, context.now) } : {}),
      source: EntrySource.WEB_AGENT,
    }),
  );
}
