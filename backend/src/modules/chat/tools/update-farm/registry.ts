import { z } from 'zod';

export const updateFarmRegistry = {
  description:
    'Atualiza dados estruturados da fazenda atual. O sistema conclui o onboarding automaticamente quando nome, área total, localização e atividade principal estiverem preenchidos.',
  inputSchema: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      totalAreaHa: z
        .string()
        .regex(/^\d+(?:\.\d{1,2})?$/)
        .optional(),
      primaryActivity: z.string().trim().min(1).max(200).optional(),
      location: z.string().trim().min(1).max(300).optional(),
      mainCrops: z.string().trim().min(1).max(500).optional(),
      approximateAnimalCount: z.number().int().nonnegative().optional(),
    })
    .strict()
    .refine(
      (input) => Object.keys(input).length > 0,
      'Provide at least one field.',
    ),
};
