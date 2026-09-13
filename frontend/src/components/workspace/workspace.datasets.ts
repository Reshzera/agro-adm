import { cattleEndpoints } from '../../service/cattle'
import { financialEndpoints } from '../../service/financial'
import type { CattleLot, Paddock, SettingSource } from '../../service/cattle/responses'
import type { FinancialEntry } from '../../service/financial/responses'
import { cattleCategoryLabel, categoryLabel, formatDate, formatMoney } from '../generative-ui/format'
import type { WorkspaceDataset, WorkspaceFilters } from '../../workspace/workspace.commands'

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

export const workspaceDatasetDefinitions: Record<WorkspaceDataset, WorkspaceDatasetDefinition> = {
  expenses: {
    label: 'Despesas',
    singular: 'Despesa',
    noun: 'lançamentos',
    columns: ['Data', 'Descrição', 'Categoria', 'Valor'],
    usesFilters: true,
    load: async (filters, signal) => {
      const { data } = await financialEndpoints.entries({ ...filters, type: 'EXPENSE' }, signal)
      return data.entries.map((entry) => entryRow(entry, true))
    },
  },
  revenues: {
    label: 'Receitas',
    singular: 'Receita',
    noun: 'lançamentos',
    columns: ['Data', 'Descrição', 'Valor'],
    usesFilters: true,
    load: async (filters, signal) => {
      const { data } = await financialEndpoints.entries(
        { from: filters.from, to: filters.to, type: 'REVENUE' },
        signal,
      )
      return data.entries.map((entry) => entryRow(entry, false))
    },
  },
  cattleLots: {
    label: 'Lotes',
    singular: 'Lote',
    noun: 'lotes',
    columns: ['Lote', 'Categoria', 'Cabeças', 'Pasto'],
    usesFilters: false,
    load: async (_filters, signal) => (await cattleEndpoints.lots(signal)).data.map(lotRow),
  },
  paddocks: {
    label: 'Pastos',
    singular: 'Pasto',
    noun: 'pastos',
    columns: ['Pasto', 'Área', 'Ocupação', 'Cabeças'],
    usesFilters: false,
    load: async (_filters, signal) => (await cattleEndpoints.paddocks(signal)).data.map(paddockRow),
  },
}

export function filterSummary(filters: WorkspaceFilters): string {
  const parts = [
    filters.from ? `de ${formatDate(filters.from)}` : null,
    filters.to ? `até ${formatDate(filters.to)}` : null,
    filters.category ? categoryLabel(filters.category) : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
