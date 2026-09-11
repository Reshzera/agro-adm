import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolvePeriod, serialize } from '../utils';
import { getExpensesRegistry } from './registry';

export async function getExpenses(
  context: ToolContext,
  input: z.infer<typeof getExpensesRegistry.inputSchema>,
) {
  const { category, term, areaId, ...period } = input;
  return serialize(
    await context.financial.listExpenses(context.farmId, {
      ...resolvePeriod(period, context.now),
      ...(category ? { category } : {}),
      ...(term ? { term } : {}),
      ...(areaId ? { areaId } : {}),
    }),
  );
}
