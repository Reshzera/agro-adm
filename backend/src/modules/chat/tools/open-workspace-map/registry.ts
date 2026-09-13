import { z } from 'zod';

export const openWorkspaceMapRegistry = {
  description:
    'Abre o mapa da fazenda no painel, sobre a imagem de satélite, e enquadra os pastos indicados. Use quando a pergunta for de lugar — onde está um lote, quais pastos fazem divisa, que pedaço da fazenda está em pastejo. Você só escolhe o enquadramento: desenhar ou corrigir o contorno de um pasto é ato do produtor na tela de rebanho, e nenhuma ordem sua altera um contorno. Como toda ordem de painel, esta substitui o que estiver na tela e vem completa: para trocar os pastos enquadrados, mande a lista inteira de novo.',
  inputSchema: z
    .object({
      paddockIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(50)
        .describe(
          'Ids dos pastos a enquadrar, vindos de getCattleOverview. Omita para enquadrar a fazenda inteira.',
        )
        .optional(),
      title: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .describe('Título curto do painel, na língua do produtor.')
        .optional(),
    })
    .strict(),
};
