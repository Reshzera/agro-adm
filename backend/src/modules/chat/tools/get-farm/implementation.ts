import type { ToolContext } from '../types';
import { serialize } from '../utils';

export async function getFarm(context: ToolContext) {
  return serialize(await context.farms.getForAgent(context.farmId));
}
