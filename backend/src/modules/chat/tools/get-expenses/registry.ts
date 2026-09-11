import { z } from 'zod';
import { categorySchema, periodSchema } from '../utils';

export const getExpensesRegistry = {
  description:
    'Lista despesas da fazenda, com filtros opcionais de período, categoria, área ou texto. Cada despesa vem com o rateio por área; o gasto de uma área é a soma das alocações daquela área, nunca o valor cheio da despesa.',
  inputSchema: periodSchema
    .extend({
      category: categorySchema.optional(),
      areaId: z
        .string()
        .min(1)
        .describe(
          'Id de uma área cadastrada da fazenda. Devolve as despesas com alguma alocação nessa área.',
        )
        .optional(),
      term: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .describe(
          'Trecho literal da descrição, sem curinga: a busca é por substring e ignora maiúsculas.',
        )
        .optional(),
    })
    .strict(),
};
