import { isTemporalGrouping, type WorkspaceChartView, type WorkspaceGrouping, type WorkspaceMeasure } from './workspace.commands'

export type WorkspaceFact = {
  keys: Partial<Record<WorkspaceGrouping, string>>
  values: Partial<Record<WorkspaceMeasure, number>>
}

export type WorkspaceSlice = {
  key: string
  value: number
  share: number
}

type SeriesSpec = Pick<WorkspaceChartView, 'groupBy' | 'measure'>

export function chartSlices(facts: WorkspaceFact[], spec: SeriesSpec): WorkspaceSlice[] {
  const totals = new Map<string, number>()
  for (const fact of facts) {
    const key = fact.keys[spec.groupBy]
    if (key === undefined) continue
    totals.set(key, (totals.get(key) ?? 0) + (fact.values[spec.measure] ?? 0))
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0)
  const slices = [...totals].map(([key, value]) => ({
    key,
    value,
    share: total === 0 ? 0 : value / total,
  }))

  return isTemporalGrouping(spec.groupBy)
    ? slices.sort((a, b) => a.key.localeCompare(b.key))
    : slices.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
}

export function slicesTotal(slices: WorkspaceSlice[]): number {
  return slices.reduce((sum, slice) => sum + slice.value, 0)
}

export type WorkspaceArc = { key: string; length: number; offset: number }

export function pieArcs(slices: WorkspaceSlice[]): WorkspaceArc[] {
  return slices.map((slice, index) => ({
    key: slice.key,
    length: slice.share * 100,
    offset: 25 - slices.slice(0, index).reduce((sum, previous) => sum + previous.share * 100, 0),
  }))
}
