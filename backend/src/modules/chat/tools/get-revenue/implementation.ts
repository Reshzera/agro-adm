import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolvePeriod, serialize } from '../utils';
import { getRevenueRegistry } from './registry';

export async function getRevenue(
  context: ToolContext,
  input: z.infer<typeof getRevenueRegistry.inputSchema>,
) {
  return serialize(
    await context.financial.listRevenues(
      context.farmId,
      resolvePeriod(input, context.now),
    ),
  );
}
