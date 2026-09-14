import { attentionEndpoints } from '../../service/attention'
import { cattleEndpoints } from '../../service/cattle'
import { financialEndpoints } from '../../service/financial'
import type {
  AttentionExplanation,
  AttentionItem,
  AttentionMeasure,
  AttentionScope,
  AttentionSeverity,
  AttentionThreshold,
  ThresholdSource,
} from '../../service/attention/responses'
import type { CattleLot, Paddock, SettingSource } from '../../service/cattle/responses'
import type { FinancialEntry } from '../../service/financial/responses'
import { cattleCategoryLabel, categoryLabel, formatDate, formatMoney } from '../generative-ui/format'
import type {
  WorkspaceDataset,
  WorkspaceEntityType,
  WorkspaceFilters,
  WorkspaceGrouping,
  WorkspaceMeasure,
} from '../../workspace/workspace.commands'
import type { WorkspaceFact } from '../../workspace/workspace.series'

export type WorkspaceRowLink = {
  label: string
  entityType: WorkspaceEntityType
  entityId: string
}

export type WorkspaceRow = {
  id: string
  title: string
  cells: string[]
  details: { label: string; value: string }[]
  tone?: 'info' | 'warning' | 'critical'
  links?: WorkspaceRowLink[]
}

export type WorkspaceDatasetDefinition = {
  label: string
  singular: string
  noun: string
  columns: string[]
  usesFilters: boolean
  load(filters: WorkspaceFilters, signal?: AbortSignal): Promise<WorkspaceRow[]>
  facts(filters: WorkspaceFilters, signal?: AbortSignal): Promise<WorkspaceFact[]>
  detail?(entityId: string, signal?: AbortSignal): Promise<WorkspaceRow>
}

type DatasetSource<T> = {
  label: string
  singular: string
  noun: string
  columns: string[]
  usesFilters: boolean
  fetch(filters: WorkspaceFilters, signal?: AbortSignal): Promise<T[]>
  row(item: T): WorkspaceRow
  fact(item: T): WorkspaceFact
  detail?(entityId: string, signal?: AbortSignal): Promise<WorkspaceRow>
}

function defineDataset<T>(source: DatasetSource<T>): WorkspaceDatasetDefinition {
  return {
    label: source.label,
    singular: source.singular,
    noun: source.noun,
    columns: source.columns,
    usesFilters: source.usesFilters,
    load: async (filters, signal) => (await source.fetch(filters, signal)).map(source.row),
    facts: async (filters, signal) => (await source.fetch(filters, signal)).map(source.fact),
    ...(source.detail ? { detail: source.detail } : {}),
  }
}

const sourceLabels: Record<SettingSource, string> = {
  PADDOCK: 'do pasto',
  FARM: 'da fazenda',
  SYSTEM: 'do sistema',
}

function hectares(value: string | null): string {
  return value ? `${Number(value).toLocaleString('pt-BR')} ha` : 'não informada'
}

function allocationSummary(entry: FinancialEntry): string {
  if (!entry.allocations?.length) return 'sem rateio'
  return entry.allocations
    .map((allocation) => `${allocation.area?.name ?? 'geral'}: ${formatMoney(allocation.amount)}`)
    .join(' · ')
}

function entryRow(entry: FinancialEntry, withCategory: boolean): WorkspaceRow {
  return {
    id: entry.id,
    title: entry.description,
    cells: withCategory
      ? [formatDate(entry.date), entry.description, categoryLabel(entry.category ?? 'OTHER'), formatMoney(entry.amount)]
      : [formatDate(entry.date), entry.description, formatMoney(entry.amount)],
    details: [
      { label: 'Data', value: formatDate(entry.date) },
      { label: 'Valor', value: formatMoney(entry.amount) },
      ...(withCategory ? [{ label: 'Categoria', value: categoryLabel(entry.category ?? 'OTHER') }] : []),
      { label: 'Origem', value: entry.source === 'MANUAL' ? 'lançamento manual' : entry.source.toLocaleLowerCase('pt-BR') },
      ...(withCategory ? [{ label: 'Rateio', value: allocationSummary(entry) }] : []),
    ],
  }
}

function lotRow(lot: CattleLot): WorkspaceRow {
  const paddock = lot.currentOccupancy?.paddock.name ?? 'sem pasto'
  return {
    id: lot.id,
    title: lot.name,
    cells: [lot.name, cattleCategoryLabel(lot.category), String(lot.headCount), paddock],
    details: [
      { label: 'Categoria', value: cattleCategoryLabel(lot.category) },
      { label: 'Cabeças', value: String(lot.headCount) },
      { label: 'Pasto atual', value: paddock },
      {
        label: 'Nesse pasto desde',
        value: lot.currentOccupancy ? formatDate(lot.currentOccupancy.startedAt) : 'nunca colocado',
      },
      { label: 'Finalidade', value: lot.purpose ?? 'não informada' },
      { label: 'Formado em', value: lot.startedOn ? formatDate(lot.startedOn) : 'não informado' },
      { label: 'Situação', value: lot.active ? 'ativo' : 'inativo' },
      { label: 'Observações', value: lot.notes ?? 'nenhuma' },
    ],
  }
}

function paddockRow(paddock: Paddock): WorkspaceRow {
  const heads = paddock.occupancies.reduce((total, occupancy) => total + occupancy.lot.headCount, 0)
  const lots = paddock.occupancies.map((occupancy) => occupancy.lot.name).join(', ') || 'vazio'
  const grazing = paddock.effectiveSettings.maxGrazingDays
  const rest = paddock.effectiveSettings.minRestDays
  const stocking = paddock.effectiveSettings.stockingRateHeadPerHa
  return {
    id: paddock.id,
    title: paddock.name,
    cells: [paddock.name, hectares(paddock.hectares), lots, String(heads)],
    details: [
      { label: 'Área', value: hectares(paddock.hectares) },
      { label: 'Área aproveitável', value: hectares(paddock.usableAreaHa) },
      { label: 'Ocupação', value: lots },
      { label: 'Cabeças', value: String(heads) },
      {
        label: 'Pastejo máximo',
        value: grazing.value === null ? 'sem limite' : `${grazing.value} dias (${sourceLabels[grazing.source]})`,
      },
      {
        label: 'Descanso mínimo',
        value: rest.value === null ? 'sem limite' : `${rest.value} dias (${sourceLabels[rest.source]})`,
      },
      {
        label: 'Lotação',
        value:
          stocking.value === null
            ? 'não configurada'
            : `${Number(stocking.value).toLocaleString('pt-BR')} cab/ha (${sourceLabels[stocking.source]})`,
      },
      { label: 'Forragem', value: paddock.forageType ?? 'não informada' },
    ],
  }
}

function entryFact(entry: FinancialEntry, withCategory: boolean): WorkspaceFact {
  const day = entry.date.slice(0, 10)
  return {
    keys: {
      ...(withCategory ? { category: entry.category ?? 'OTHER' } : {}),
      month: day.slice(0, 7),
      day,
    },
    values: { amount: Number(entry.amount), count: 1 },
  }
}

function lotFact(lot: CattleLot): WorkspaceFact {
  return {
    keys: {
      cattleCategory: lot.category,
      paddock: lot.currentOccupancy?.paddock.name ?? 'Sem pasto',
    },
    values: { headCount: lot.headCount, count: 1 },
  }
}

function paddockFact(paddock: Paddock): WorkspaceFact {
  return {
    keys: { paddock: paddock.name },
    values: {
      hectares: Number(paddock.hectares ?? 0),
      headCount: paddock.occupancies.reduce((total, occupancy) => total + occupancy.lot.headCount, 0),
      count: 1,
    },
  }
}

const severityLabels: Record<AttentionSeverity, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Atenção',
  INFO: 'Informativo',
}

const severityTones: Record<AttentionSeverity, 'info' | 'warning' | 'critical'> = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
}

const thresholdSourceLabels: Record<ThresholdSource, string> = {
  PADDOCK: 'limite do próprio pasto',
  FARM: 'padrão da fazenda',
  UNCONFIGURED: 'sem limite configurado',
}

const unitLabels: Record<string, string> = { head: 'cabeças', days: 'dias' }

const factLabels: Record<string, string> = {
  currentHeadCount: 'Cabeças no pasto',
  usableAreaHa: 'Área aproveitável (ha)',
  configuredStockingRateHeadPerHa: 'Lotação configurada (cab/ha)',
  utilizationPercent: 'Uso da lotação (%)',
  previousOccupancyEndedAt: 'Pasto vagou em',
  destinationEntryAt: 'Gado entrou em',
  restDays: 'Dias de descanso',
  occupancyStartedAt: 'Ocupação começou em',
  evaluatedAt: 'Avaliado em',
  grazingDays: 'Dias de pastejo',
  reviewDueAt: 'Revisão prevista para',
}

const scopeNouns: Record<AttentionScope['type'], string> = {
  FARM: 'a fazenda',
  PADDOCK: 'o pasto',
  LOT: 'o lote',
  ANIMAL: 'o animal',
}

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T/

function formatInstant(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateTimeFormat.format(parsed)
}

function decimal(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function measureText(measure: AttentionMeasure | null): string {
  if (!measure || measure.value === null) return 'não registrado'
  return `${decimal(measure.value)} ${measure.unit}`
}

function thresholdText(threshold: AttentionThreshold): string {
  const unit = threshold.unit ? (unitLabels[threshold.unit] ?? threshold.unit) : ''
  const source = thresholdSourceLabels[threshold.source]
  if (threshold.value === null) return source
  return `${decimal(threshold.value)}${unit ? ` ${unit}` : ''} (${source})`
}

function factText(value: unknown): string {
  if (value === null || value === undefined) return 'não registrado'
  if (typeof value === 'number') return decimal(value)
  if (typeof value === 'string') return ISO_INSTANT.test(value) ? formatInstant(value) : value
  return JSON.stringify(value)
}

function factDetails(facts: Record<string, unknown> | null) {
  return Object.entries(facts ?? {}).map(([key, value]) => ({
    label: factLabels[key] ?? key,
    value: factText(value),
  }))
}

function scopeLink(scope: AttentionScope): WorkspaceRowLink[] {
  if (scope.type === 'PADDOCK')
    return [{ label: `Ver ${scope.name ?? 'o pasto'}`, entityType: 'paddock', entityId: scope.id }]
  if (scope.type === 'LOT')
    return [{ label: `Ver ${scope.name ?? 'o lote'}`, entityType: 'cattleLot', entityId: scope.id }]
  return []
}

function scopeText(scope: AttentionScope): string {
  return scope.name ?? scopeNouns[scope.type]
}

function attentionRow(item: AttentionItem): WorkspaceRow {
  return {
    id: item.id,
    title: item.title,
    tone: severityTones[item.severity],
    cells: [
      severityLabels[item.severity],
      item.summary,
      scopeText(item.scope),
      formatInstant(item.lastSeenAt),
    ],
    details: [
      { label: 'Situação', value: item.summary },
      { label: item.measured?.label ?? 'Medido', value: measureText(item.measured) },
      { label: 'Limite aplicado', value: thresholdText(item.threshold) },
      { label: 'Gravidade', value: severityLabels[item.severity] },
      { label: 'Regra', value: `${item.ruleId} · versão ${item.ruleVersion}` },
      { label: 'Visto primeiro em', value: formatInstant(item.firstSeenAt) },
      { label: 'Última avaliação', value: formatInstant(item.lastSeenAt) },
    ],
    links: scopeLink(item.scope),
  }
}

function explanationRow(explanation: AttentionExplanation): WorkspaceRow {
  const events = explanation.sourceEvents.map(
    (event) => `${event.eventType} em ${formatInstant(event.occurredAt)}`,
  )
  const action = explanation.suggestedAction?.action
  const decision = [
    { label: 'Situação', value: explanation.summary },
    {
      label: explanation.measured?.label ?? 'Medido',
      value: measureText(explanation.measured),
    },
    { label: 'Limite aplicado', value: thresholdText(explanation.threshold) },
    { label: 'Onde', value: scopeText(explanation.scope) },
    { label: 'Regra', value: explanation.ruleId },
    { label: 'Versão da regra', value: `versão ${explanation.ruleVersion}` },
    { label: 'Avaliado em', value: formatInstant(explanation.evaluatedAt) },
  ]
  const decided = new Set(decision.map((field) => field.label))

  return {
    id: explanation.attentionItemId,
    title: explanation.ruleTitle,
    tone: explanation.severity ? severityTones[explanation.severity] : undefined,
    cells: [],
    details: [
      ...decision,
      ...factDetails(explanation.facts).filter((fact) => !decided.has(fact.label)),
      {
        label: 'Eventos de origem',
        value: events.length ? events.join(' · ') : 'nenhum evento correlacionado',
      },
      ...(typeof action === 'string' ? [{ label: 'Sugestão', value: action }] : []),
    ],
    links: scopeLink(explanation.scope),
  }
}

export const workspaceDatasetDefinitions: Record<WorkspaceDataset, WorkspaceDatasetDefinition> = {
  expenses: defineDataset({
    label: 'Despesas',
    singular: 'Despesa',
    noun: 'lançamentos',
    columns: ['Data', 'Descrição', 'Categoria', 'Valor'],
    usesFilters: true,
    fetch: async (filters, signal) =>
      (await financialEndpoints.entries({ ...filters, type: 'EXPENSE' }, signal)).data.entries,
    row: (entry) => entryRow(entry, true),
    fact: (entry) => entryFact(entry, true),
  }),
  revenues: defineDataset({
    label: 'Receitas',
    singular: 'Receita',
    noun: 'lançamentos',
    columns: ['Data', 'Descrição', 'Valor'],
    usesFilters: true,
    fetch: async (filters, signal) =>
      (
        await financialEndpoints.entries(
          { from: filters.from, to: filters.to, type: 'REVENUE' },
          signal,
        )
      ).data.entries,
    row: (entry) => entryRow(entry, false),
    fact: (entry) => entryFact(entry, false),
  }),
  cattleLots: defineDataset({
    label: 'Lotes',
    singular: 'Lote',
    noun: 'lotes',
    columns: ['Lote', 'Categoria', 'Cabeças', 'Pasto'],
    usesFilters: false,
    fetch: async (_filters, signal) => (await cattleEndpoints.lots(signal)).data,
    row: lotRow,
    fact: lotFact,
  }),
  attentionItems: defineDataset({
    label: 'Pedindo atenção',
    singular: 'Item de atenção',
    noun: 'itens de atenção',
    columns: ['Gravidade', 'O que está acontecendo', 'Onde', 'Última avaliação'],
    usesFilters: false,
    fetch: async (_filters, signal) => (await attentionEndpoints.items(signal)).data,
    row: attentionRow,
    fact: () => ({ keys: {}, values: { count: 1 } }),
    detail: async (entityId, signal) =>
      explanationRow((await attentionEndpoints.explanation(entityId, signal)).data),
  }),
  paddocks: defineDataset({
    label: 'Pastos',
    singular: 'Pasto',
    noun: 'pastos',
    columns: ['Pasto', 'Área', 'Ocupação', 'Cabeças'],
    usesFilters: false,
    fetch: async (_filters, signal) => (await cattleEndpoints.paddocks(signal)).data,
    row: paddockRow,
    fact: paddockFact,
  }),
}

const monthFormat = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function groupKeyLabel(grouping: WorkspaceGrouping, key: string): string {
  switch (grouping) {
    case 'category':
      return categoryLabel(key)
    case 'cattleCategory':
      return cattleCategoryLabel(key)
    case 'month':
      return monthFormat.format(new Date(`${key}-01T00:00:00.000Z`))
    case 'day':
      return formatDate(key)
    case 'paddock':
      return key
  }
}

export function measureValueLabel(measure: WorkspaceMeasure, value: number): string {
  switch (measure) {
    case 'amount':
      return formatMoney(value.toFixed(2))
    case 'hectares':
      return `${value.toLocaleString('pt-BR')} ha`
    case 'headCount':
      return `${value.toLocaleString('pt-BR')} cab`
    case 'count':
      return value.toLocaleString('pt-BR')
  }
}

export function filterSummary(filters: WorkspaceFilters): string {
  const parts = [
    filters.from ? `de ${formatDate(filters.from)}` : null,
    filters.to ? `até ${formatDate(filters.to)}` : null,
    filters.category ? categoryLabel(filters.category) : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
