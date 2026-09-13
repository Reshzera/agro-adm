import { z } from 'zod'
import type { ExpenseCategory } from '../service/financial/responses'

export const workspaceDatasets = ['expenses', 'revenues', 'cattleLots', 'paddocks'] as const
export const workspaceEntities = ['expense', 'revenue', 'cattleLot', 'paddock'] as const
export const workspaceToolNames = ['openWorkspaceTable', 'openWorkspaceEntity'] as const

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

export type WorkspaceView = WorkspaceTableView | WorkspaceEntityView

export type WorkspaceCommandResult = { ok: true; view: WorkspaceView } | { ok: false; error: string }

function rejection(error: z.ZodError): WorkspaceCommandResult {
  const detail = error.issues
    .map((issue) => `${issue.path.join('.') || 'comando'}: ${issue.message}`)
    .join('; ')
  return { ok: false, error: `Comando de painel inválido — ${detail}.` }
}

export function parseWorkspaceCommand(tool: string, input: unknown): WorkspaceCommandResult {
  if (tool === 'openWorkspaceTable') {
    const parsed = tableCommandSchema.safeParse(input)
    if (!parsed.success) return rejection(parsed.error)
    const { dataset, title, filters } = parsed.data
    return { ok: true, view: { kind: 'table', dataset, ...(title ? { title } : {}), filters: filters ?? {} } }
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
  }
}
