import type { z } from 'zod';
import type { ToolContext } from '../types';
import { deleteExpenseRegistry } from './registry';

export async function deleteExpense(
  context: ToolContext,
  input: z.infer<typeof deleteExpenseRegistry.inputSchema>,
) {
  await context.financial.deleteExpense(context.farmId, input.id);
  return { deleted: true, id: input.id };
}
