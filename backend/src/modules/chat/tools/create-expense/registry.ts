import { z } from 'zod';
import { categorySchema, moneySchema, relativeDateSchema } from '../utils';

export const createExpenseRegistry = {
  description:
    'Registra uma despesa já confirmada pelo produtor. Antes de chamar, apresente seu entendimento (valor, data, categoria e rateio).',
  inputSchema: z
    .object({
      amount: moneySchema,
      date: relativeDateSchema,
      description: z.string().trim().min(1).max(2_000),
      category: categorySchema,
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
