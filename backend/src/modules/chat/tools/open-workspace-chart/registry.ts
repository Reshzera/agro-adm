import { ExpenseCategory } from '@prisma/client';
import { z } from 'zod';
import { workspaceDatasets } from '../open-workspace-table/registry';
import { workspaceDateSchema } from '../utils';

export const workspaceChartShapes = ['bar', 'line', 'pie'] as const;
export const workspaceGroupings = [
  'category',
  'month',
  'day',
  'paddock',
  'cattleCategory',
] as const;
export const workspaceMeasures = [
  'amount',
  'count',
  'headCount',
  'hectares',
] as const;

export const openWorkspaceChartRegistry = {
  description:
    'Desenha um gráfico no painel da tela a partir dos mesmos dados das tabelas. Use quando o produtor quiser enxergar proporção ou evolução — despesa por categoria, gasto mês a mês, cabeças por pasto. Você escolhe só a apresentação: forma, agrupamento e medida. Os números vêm da consulta, nunca de você, então não escreva valores na resposta que o painel ainda vai calcular. Como toda ordem de painel, esta substitui o que estiver na tela e vem completa: para trocar o agrupamento ou o período, mande o comando inteiro de novo.',
  inputSchema: z
    .object({
      dataset: z
        .enum(workspaceDatasets)
        .describe(
          'Conjunto medido: expenses (despesas), revenues (receitas), cattleLots (lotes) ou paddocks (pastos).',
        ),
      shape: z
        .enum(workspaceChartShapes)
        .describe(
          'Forma do gráfico: bar compara grupos, line mostra evolução no tempo (só com groupBy month ou day) e pie reparte um total entre categorias (não aceita month nem day).',
        ),
      groupBy: z
        .enum(workspaceGroupings)
        .describe(
          'O que vai no eixo dos rótulos. expenses aceita category, month e day; revenues aceita month e day; cattleLots aceita cattleCategory e paddock; paddocks aceita paddock.',
        ),
      measure: z
        .enum(workspaceMeasures)
        .describe(
          'O que é somado em cada grupo. expenses e revenues aceitam amount e count; cattleLots aceita headCount e count; paddocks aceita hectares, headCount e count.',
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
          'Recorte dos dados antes de somar. Período e categoria valem para expenses e revenues; os conjuntos de gado ignoram os dois.',
        )
        .optional(),
    })
    .strict(),
};
