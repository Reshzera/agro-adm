import { z } from 'zod';

export const updateFarmContextRegistry = {
  description:
    'Substitui integralmente o contexto qualitativo em markdown. Envie a versão anterior e a versão completa nova; nunca acrescente fragmentos.',
  inputSchema: z
    .object({
      previousContext: z.string().nullable(),
      context: z.string().trim().min(1).max(10_000),
    })
    .strict(),
};
