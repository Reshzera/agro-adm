import type { z } from 'zod';
import type { ToolContext } from '../types';
import { serialize } from '../utils';
import { updateFarmContextRegistry } from './registry';

export async function updateFarmContext(
  context: ToolContext,
  input: z.infer<typeof updateFarmContextRegistry.inputSchema>,
) {
  const farm = await context.farms.getForAgent(context.farmId);
  if (farm.agentContext !== input.previousContext) {
    return {
      updated: false,
      reason: 'O contexto foi alterado; consulte a fazenda e tente novamente.',
    };
  }
  return serialize(
    await context.farms.updateForAgent(context.farmId, {
      agentContext: input.context,
    }),
  );
}
