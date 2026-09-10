import { z } from 'zod';
import { categorySchema, periodSchema } from '../utils';

export const getExpensesRegistry = {
  description:
    'Lista despesas da fazenda, com filtros opcionais de período, categoria ou texto.',
  inputSchema: periodSchema
    .extend({
      category: categorySchema.optional(),
      term: z.string().trim().min(1).max(200).optional(),
    })
    .strict(),
};
