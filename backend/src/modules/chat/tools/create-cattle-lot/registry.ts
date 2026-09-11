import { CattleCategory } from '@prisma/client';
import { z } from 'zod';
import { relativeDateSchema } from '../utils';

export const createCattleLotRegistry = {
  description:
    'Cria um lote de gado na fazenda atual depois da confirmação explícita do produtor. Não abre ocupação: o lote começa sem pasto.',
  inputSchema: z
    .object({
      name: z.string().trim().min(1).max(200),
      category: z.enum(CattleCategory),
      headCount: z.number().int().min(0).max(100_000_000),
      purpose: z.string().trim().max(300).nullish(),
      startedOn: relativeDateSchema.nullish(),
      notes: z.string().trim().max(2_000).nullish(),
    })
    .strict(),
  needsApproval: true,
};
