import { z } from 'zod';

export const getCattleOverviewRegistry = {
  description:
    'Lista os lotes e os pastos da fazenda com seus identificadores, cabeças e ocupação atual. Use sempre antes de mover um lote, para resolver os nomes citados pelo produtor.',
  inputSchema: z.object({}).strict(),
};
