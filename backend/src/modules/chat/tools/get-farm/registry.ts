import { z } from 'zod';

export const getFarmRegistry = {
  description: 'Consulta os dados estruturados da fazenda atual.',
  inputSchema: z.object({}).strict(),
};
