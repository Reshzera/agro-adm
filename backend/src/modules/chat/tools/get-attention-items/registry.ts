import { z } from 'zod';

export const getAttentionItemsRegistry = {
  description:
    'Lista o que está pedindo atenção na fazenda agora, em ordem de gravidade, já com o valor medido, o limite que valeu e a regra que decidiu. Um item que se resolveu sozinho não aparece aqui. Use antes de comentar alertas e responda somente com o que vier nesta lista.',
  inputSchema: z.object({}).strict(),
};
