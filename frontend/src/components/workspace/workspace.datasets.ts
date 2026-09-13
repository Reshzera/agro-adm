import { cattleEndpoints } from '../../service/cattle'
import { financialEndpoints } from '../../service/financial'
import type { CattleLot, Paddock, SettingSource } from '../../service/cattle/responses'
import type { FinancialEntry } from '../../service/financial/responses'
import { cattleCategoryLabel, categoryLabel, formatDate, formatMoney } from '../generative-ui/format'
import type {
  WorkspaceDataset,
  WorkspaceFilters,
  WorkspaceGrouping,
  WorkspaceMeasure,
} from '../../workspace/workspace.commands'
import type { WorkspaceFact } from '../../workspace/workspace.series'

export type WorkspaceRow = {
  id: string
  title: string
  cells: string[]
  details: { label: string; value: string }[]
}

export type WorkspaceDatasetDefinition = {
  label: string
  singular: string
  noun: string
  columns: string[]
  usesFilters: boolean
  load(filters: WorkspaceFilters, signal?: AbortSignal): Promise<WorkspaceRow[]>
  facts(filters: WorkspaceFilters, signal?: AbortSignal): Promise<WorkspaceFact[]>
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
