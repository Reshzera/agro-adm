import type { z } from 'zod';
import type { ToolContext } from '../types';
import { serialize } from '../utils';
import { explainAttentionItemRegistry } from './registry';

export async function explainAttentionItem(
  context: ToolContext,
  input: z.infer<typeof explainAttentionItemRegistry.inputSchema>,
) {
  return serialize(
    await context.attention.explain(context.farmId, input.attentionItemId),
  );
}
