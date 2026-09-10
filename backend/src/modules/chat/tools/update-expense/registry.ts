import { z } from 'zod';
import { categorySchema, moneySchema, relativeDateSchema } from '../utils';

export const updateExpenseRegistry = {
  description: 'Atualiza uma despesa existente da fazenda atual.',
  inputSchema: z
    .object({
      id: z.string().min(1),
      amount: moneySchema.optional(),
      date: relativeDateSchema.optional(),
      description: z.string().trim().min(1).max(2_000).optional(),
      category: categorySchema.optional(),
      allocations: z
        .array(
          z.object({
            areaId: z.string().min(1).nullable(),
            amount: moneySchema,
          }),
        )
        .min(1)
        .optional(),
    })
    .strict(),
};
