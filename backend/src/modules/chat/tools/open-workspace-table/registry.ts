import { ExpenseCategory } from '@prisma/client';
import { z } from 'zod';
import { workspaceDateSchema } from '../utils';

export const workspaceDatasets = [
  'expenses',
  'revenues',
  'cattleLots',
  'paddocks',
  'attentionItems',
] as const;

export const openWorkspaceTableRegistry = {
  description:
    'Abre uma tabela no painel da tela, ao lado da conversa. Use sempre que o produtor pedir dados que não cabem em uma frase, em vez de listar linhas na resposta; o painel guarda a tabela e a conversa fica com o resumo. O comando substitui o que estiver no painel e precisa vir completo: repita todos os filtros a cada chamada, inclusive os que já estavam valendo. Não existe comando para alterar só um filtro.',
  inputSchema: z
    .object({
      dataset: z
        .enum(workspaceDatasets)
        .describe(
          'Conjunto exibido: expenses (despesas), revenues (receitas), cattleLots (lotes de gado), paddocks (pastos) ou attentionItems (o que está pedindo atenção, em ordem de gravidade).',
        ),
      title: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .describe('Título curto do painel, na língua do produtor.')
        .optional(),
      filters: z
        .object({
          from: workspaceDateSchema.optional(),
          to: workspaceDateSchema.optional(),
          category: z.enum(ExpenseCategory).optional(),
        })
        .strict()
        .describe(
          'Filtros da tabela. Período e categoria valem para expenses e revenues; os conjuntos de gado ignoram os dois.',
        )
        .optional(),
    })
    .strict(),
};
