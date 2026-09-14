import type { ToolContext } from '../types';
import { serialize } from '../utils';

export async function getAttentionItems(context: ToolContext) {
  return serialize(await context.attention.list(context.farmId));
}
