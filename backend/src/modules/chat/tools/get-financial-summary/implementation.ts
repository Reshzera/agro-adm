import type { z } from 'zod';
import type { ToolContext } from '../types';
import { resolvePeriod, serialize } from '../utils';
import { getFinancialSummaryRegistry } from './registry';

export async function getFinancialSummary(
  context: ToolContext,
  input: z.infer<typeof getFinancialSummaryRegistry.inputSchema>,
) {
  return serialize(
    await context.financial.getFinancialSummary(
      context.farmId,
      resolvePeriod(input, context.now),
    ),
  );
}
