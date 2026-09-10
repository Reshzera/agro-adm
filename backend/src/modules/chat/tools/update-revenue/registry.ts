import { z } from 'zod';
import { moneySchema, relativeDateSchema } from '../utils';

export const updateRevenueRegistry = {
  description: 'Atualiza uma receita existente da fazenda atual.',
  inputSchema: z
    .object({
      id: z.string().min(1),
      amount: moneySchema.optional(),
      date: relativeDateSchema.optional(),
      description: z.string().trim().min(1).max(2_000).optional(),
    })
    .strict(),
};
