import { z } from 'zod'
import type { ExpenseCategory } from '../service/financial/responses'

export const workspaceDatasets = ['expenses', 'revenues', 'cattleLots', 'paddocks', 'attentionItems'] as const
export const workspaceEntities = ['expense', 'revenue', 'cattleLot', 'paddock', 'attentionItem'] as const
export const workspaceToolNames = [
  'openWorkspaceTable',
  'openWorkspaceEntity',
  'openWorkspaceChart',
  'openWorkspaceMap',
] as const
export const workspaceChartShapes = ['bar', 'line', 'pie'] as const
export const workspaceGroupings = ['category', 'month', 'day', 'paddock', 'cattleCategory'] as const
export const workspaceMeasures = ['amount', 'count', 'headCount', 'hectares'] as const
export const temporalGroupings = ['month', 'day'] as const

const expenseCategories = [
  'FUEL',
  'FEED_AND_SUPPLEMENT',
  'FERTILIZER_AND_SEED',
  'PESTICIDE',
  'ANIMAL_HEALTH',
  'PASTURE_AND_CROP_WORK',
  'MACHINERY_AND_MAINTENANCE',
  'LABOR',
  'OTHER',
] as const satisfies readonly ExpenseCategory[]

export type WorkspaceDataset = (typeof workspaceDatasets)[number]
export type WorkspaceEntityType = (typeof workspaceEntities)[number]
export type WorkspaceToolName = (typeof workspaceToolNames)[number]
export type WorkspaceChartShape = (typeof workspaceChartShapes)[number]
export type WorkspaceGrouping = (typeof workspaceGroupings)[number]
export type WorkspaceMeasure = (typeof workspaceMeasures)[number]

export const workspaceChartCapabilities: Record<
  WorkspaceDataset,
  { groupings: readonly WorkspaceGrouping[]; measures: readonly WorkspaceMeasure[] }
> = {
  expenses: { groupings: ['category', 'month', 'day'], measures: ['amount', 'count'] },
  revenues: { groupings: ['month', 'day'], measures: ['amount', 'count'] },
  cattleLots: { groupings: ['cattleCategory', 'paddock'], measures: ['headCount', 'count'] },
  paddocks: { groupings: ['paddock'], measures: ['hectares', 'headCount', 'count'] },
  attentionItems: { groupings: [], measures: [] },
}

export const groupingLabels: Record<WorkspaceGrouping, string> = {
  category: 'categoria',
  month: 'mês',
  day: 'dia',
  paddock: 'pasto',
  cattleCategory: 'categoria do rebanho',
}

export const measureLabels: Record<WorkspaceMeasure, string> = {
  amount: 'valor',
  count: 'quantidade de lançamentos',
  headCount: 'cabeças',
  hectares: 'hectares',
}

export function isTemporalGrouping(grouping: WorkspaceGrouping): boolean {
  return (temporalGroupings as readonly WorkspaceGrouping[]).includes(grouping)
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use uma data em YYYY-MM-DD')

const filtersSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    category: z.enum(expenseCategories).optional(),
  })
  .strict()

const tableCommandSchema = z
  .object({
    dataset: z.enum(workspaceDatasets),
    title: z.string().trim().min(1).max(80).optional(),
    filters: filtersSchema.optional(),
  })
  .strict()

const chartCommandSchema = z
  .object({
    dataset: z.enum(workspaceDatasets),
    shape: z.enum(workspaceChartShapes, {
      error: `o painel desenha ${workspaceChartShapes.join(', ')} e nada além disso`,
    }),
    groupBy: z.enum(workspaceGroupings),
    measure: z.enum(workspaceMeasures),
    title: z.string().trim().min(1).max(80).optional(),
    filters: filtersSchema.optional(),
  })
  .strict()

const mapCommandSchema = z
  .object({
    paddockIds: z.array(z.string().trim().min(1)).min(1).max(50).optional(),
    title: z.string().trim().min(1).max(80).optional(),
  })
  .strict()

const entityCommandSchema = z
  .object({
    entityType: z.enum(workspaceEntities),
    entityId: z.string().trim().min(1),
  })
  .strict()

export type WorkspaceFilters = z.infer<typeof filtersSchema>

export type WorkspaceTableView = {
  kind: 'table'
  dataset: WorkspaceDataset
  title?: string
  filters: WorkspaceFilters
}

export type WorkspaceEntityView = {
  kind: 'entity'
  entityType: WorkspaceEntityType
  entityId: string
}

export type WorkspaceChartView = {
  kind: 'chart'
  dataset: WorkspaceDataset
  shape: WorkspaceChartShape
  groupBy: WorkspaceGrouping
  measure: WorkspaceMeasure
  title?: string
  filters: WorkspaceFilters
}

export type WorkspaceMapView = {
  kind: 'map'
  paddockIds: string[]
  title?: string
}

export type WorkspaceView =
  | WorkspaceTableView
  | WorkspaceEntityView
  | WorkspaceChartView
  | WorkspaceMapView

export type WorkspaceCommandResult = { ok: true; view: WorkspaceView } | { ok: false; error: string }

function rejection(error: z.ZodError): WorkspaceCommandResult {
  const detail = error.issues
    .map((issue) => `${issue.path.join('.') || 'comando'}: ${issue.message}`)
    .join('; ')
  return { ok: false, error: `Comando de painel inválido — ${detail}.` }
}

function unsupportedChart(command: z.infer<typeof chartCommandSchema>): string | null {
  const capability = workspaceChartCapabilities[command.dataset]
  if (capability.groupings.length === 0 || capability.measures.length === 0)
    return `O painel não desenha gráfico de ${command.dataset}: esse conjunto se lê em tabela.`
  if (!capability.groupings.includes(command.groupBy))
    return `O painel não separa ${command.dataset} por ${command.groupBy}. Nesse conjunto dá para agrupar por ${capability.groupings.join(', ')}.`
  if (!capability.measures.includes(command.measure))
    return `O painel não mede ${command.dataset} por ${command.measure}. Nesse conjunto dá para medir ${capability.measures.join(', ')}.`
  if (command.shape === 'line' && !isTemporalGrouping(command.groupBy))
    return `Linha só serve para o tempo: agrupe por ${temporalGroupings.join(' ou ')}, ou peça bar para comparar ${command.groupBy}.`
  if (command.shape === 'pie' && isTemporalGrouping(command.groupBy))
    return `Pizza reparte um total entre categorias, não ao longo do tempo: para ${command.groupBy} peça line ou bar.`
  return null
}

export function parseWorkspaceCommand(tool: string, input: unknown): WorkspaceCommandResult {
  if (tool === 'openWorkspaceTable') {
    const parsed = tableCommandSchema.safeParse(input)
    if (!parsed.success) return rejection(parsed.error)
    const { dataset, title, filters } = parsed.data
    return { ok: true, view: { kind: 'table', dataset, ...(title ? { title } : {}), filters: filters ?? {} } }
  }

  if (tool === 'openWorkspaceChart') {
    const parsed = chartCommandSchema.safeParse(input)
    if (!parsed.success) return rejection(parsed.error)
    const refused = unsupportedChart(parsed.data)
    if (refused) return { ok: false, error: refused }
    const { dataset, shape, groupBy, measure, title, filters } = parsed.data
    return {
      ok: true,
      view: {
        kind: 'chart',
        dataset,
        shape,
        groupBy,
        measure,
        ...(title ? { title } : {}),
        filters: filters ?? {},
      },
    }
  }

  if (tool === 'openWorkspaceMap') {
    const parsed = mapCommandSchema.safeParse(input)
    if (!parsed.success) return rejection(parsed.error)
    const { paddockIds, title } = parsed.data
    return { ok: true, view: { kind: 'map', paddockIds: paddockIds ?? [], ...(title ? { title } : {}) } }
  }

  if (tool === 'openWorkspaceEntity') {
    const parsed = entityCommandSchema.safeParse(input)
    if (!parsed.success) return rejection(parsed.error)
    return { ok: true, view: { kind: 'entity', ...parsed.data } }
  }

  return {
    ok: false,
    error: `Comando de painel desconhecido: ${tool}. O painel só entende ${workspaceToolNames.join(' e ')}.`,
  }
}

export function datasetForEntity(entityType: WorkspaceEntityType): WorkspaceDataset {
  switch (entityType) {
    case 'expense':
      return 'expenses'
    case 'revenue':
      return 'revenues'
    case 'cattleLot':
      return 'cattleLots'
    case 'paddock':
      return 'paddocks'
    case 'attentionItem':
      return 'attentionItems'
  }
}

export function entityForDataset(dataset: WorkspaceDataset): WorkspaceEntityType {
  switch (dataset) {
    case 'expenses':
      return 'expense'
    case 'revenues':
      return 'revenue'
    case 'cattleLots':
      return 'cattleLot'
    case 'paddocks':
      return 'paddock'
    case 'attentionItems':
      return 'attentionItem'
  }
}
