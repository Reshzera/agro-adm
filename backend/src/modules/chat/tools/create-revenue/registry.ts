import { z } from 'zod';
import { moneySchema, relativeDateSchema } from '../utils';

export const createRevenueRegistry = {
  description:
    'Registra uma receita já confirmada pelo produtor. Antes de chamar, apresente seu entendimento (valor, data e descrição).',
  inputSchema: z
    .object({
      amount: moneySchema,
      date: relativeDateSchema,
      description: z.string().trim().min(1).max(2_000),
    })
    .strict(),
};
