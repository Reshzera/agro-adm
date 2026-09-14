import { z } from 'zod';

export const explainAttentionItemRegistry = {
  description:
    'Devolve a explicação gravada de um item de atenção: os fatos medidos, o limite e a origem dele, os eventos que levaram até ali, a regra e a versão que decidiu. Use sempre que o produtor perguntar por que um alerta apareceu, e responda apenas com o que vier daqui — nada de completar a explicação por conta própria.',
  inputSchema: z
    .object({
      attentionItemId: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Id do item devolvido por getAttentionItems, nunca inventado.',
        ),
    })
    .strict(),
};
