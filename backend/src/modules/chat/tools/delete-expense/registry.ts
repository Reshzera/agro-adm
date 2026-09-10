import { z } from 'zod';

export const deleteExpenseRegistry = {
  description:
    'Exclui uma despesa da fazenda atual depois da confirmação explícita do produtor.',
  inputSchema: z.object({ id: z.string().min(1) }).strict(),
  needsApproval: true,
};
