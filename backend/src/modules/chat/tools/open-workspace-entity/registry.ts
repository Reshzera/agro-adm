import { z } from 'zod';

export const workspaceEntities = [
  'expense',
  'revenue',
  'cattleLot',
  'paddock',
  'attentionItem',
] as const;

export const openWorkspaceEntityRegistry = {
  description:
    'Abre no painel a ficha de um registro só, com todos os campos dele. Use quando o produtor quiser olhar um lançamento, um lote ou um pasto específico. Como toda ordem de painel, esta substitui o que estava na tela e precisa do identificador exato devolvido por uma tool de consulta.',
  inputSchema: z
    .object({
      entityType: z
        .enum(workspaceEntities)
        .describe(
          'Tipo do registro: expense (despesa), revenue (receita), cattleLot (lote), paddock (pasto) ou attentionItem (item de atenção, que abre com a explicação gravada).',
        ),
      entityId: z
        .string()
        .trim()
        .min(1)
        .describe('Id devolvido por uma consulta, nunca inventado.'),
    })
    .strict(),
};
