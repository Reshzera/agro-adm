import { z } from 'zod';

export const updateFarmRegistry = {
  description: 'Atualiza dados estruturados da fazenda atual.',
  inputSchema: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      totalAreaHa: z
        .string()
        .regex(/^\d+(?:\.\d{1,2})?$/)
        .optional(),
      primaryActivity: z.string().trim().min(1).max(200).optional(),
      location: z.string().trim().min(1).max(300).optional(),
      onboardingCompleted: z.boolean().optional(),
    })
    .strict()
    .refine(
      (input) => Object.keys(input).length > 0,
      'Provide at least one field.',
    ),
};
