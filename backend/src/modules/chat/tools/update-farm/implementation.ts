import type { z } from 'zod';
import type { ToolContext } from '../types';
import { serialize } from '../utils';
import { updateFarmRegistry } from './registry';

export async function updateFarm(
  context: ToolContext,
  input: z.infer<typeof updateFarmRegistry.inputSchema>,
) {
  return serialize(await context.farms.updateForAgent(context.farmId, input));
}
