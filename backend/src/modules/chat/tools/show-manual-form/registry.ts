import { z } from 'zod';

export const showManualFormRegistry = {
  description:
    'Abre um formulário manual no chat para o produtor informar uma despesa ou receita. Use quando ele pedir para preencher os dados manualmente.',
  inputSchema: z
    .object({
      kind: z.enum(['expense', 'revenue']),
    })
    .strict(),
};
