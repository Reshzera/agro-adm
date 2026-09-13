import { useQuery } from '@tanstack/react-query'
import { groupingLabels, measureLabels, type WorkspaceChartView } from '../../../workspace/workspace.commands'
import { chartSlices, pieArcs, slicesTotal, type WorkspaceSlice } from '../../../workspace/workspace.series'
import { groupKeyLabel, measureValueLabel, workspaceDatasetDefinitions } from '../workspace.datasets'
import styles from './workspace-chart.module.scss'

const SERIES_COLORS = 6

function seriesColor(index: number): string {
  return `var(--series-${(index % SERIES_COLORS) + 1})`
}

function Bars({ slices, view }: { slices: WorkspaceSlice[]; view: WorkspaceChartView }) {
  const max = Math.max(...slices.map((slice) => slice.value), 0)
  return <div className={styles.bars}>
    {slices.map((slice, index) => <div key={slice.key} style={{ color: seriesColor(index) }}>
      <div className={styles.barLabel}>
        <span>{groupKeyLabel(view.groupBy, slice.key)}</span>
        <strong>{measureValueLabel(view.measure, slice.value)}</strong>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${max ? (slice.value / max) * 100 : 0}%` }} />
      </div>
    </div>)}
  </div>
}

function Line({ slices, view }: { slices: WorkspaceSlice[]; view: WorkspaceChartView }) {
  const max = Math.max(...slices.map((slice) => slice.value), 1)
  const height = (slice: WorkspaceSlice) => 92 - (slice.value / max) * 80
  const points =
    slices.length === 1
      ? `0,${height(slices[0])} 100,${height(slices[0])}`
      : slices.map((slice, index) => `${(index / (slices.length - 1)) * 100},${height(slice)}`).join(' ')

  return <div className={styles.line}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${measureLabels[view.measure]} por ${groupingLabels[view.groupBy]}`}>
      <polygon className={styles.lineArea} points={`0,100 ${points} 100,100`} />
      <polyline className={styles.lineStroke} points={points} vectorEffect="non-scaling-stroke" />
    </svg>
    <div className={styles.lineScale}>
      <span>{groupKeyLabel(view.groupBy, slices[0].key)}</span>
      <strong>{measureValueLabel(view.measure, max)} no pico</strong>
      <span>{groupKeyLabel(view.groupBy, slices[slices.length - 1].key)}</span>
    </div>
  </div>
}

function Pie({ slices, view }: { slices: WorkspaceSlice[]; view: WorkspaceChartView }) {
  const arcs = pieArcs(slices)

  return <div className={styles.pie}>
    <svg viewBox="0 0 42 42" role="img" aria-label={`${measureLabels[view.measure]} por ${groupingLabels[view.groupBy]}`}>
      <circle className={styles.pieTrack} cx="21" cy="21" r="15.915" />
      {arcs.map((arc, index) => <circle
        key={arc.key}
        className={styles.pieArc}
        style={{ color: seriesColor(index) }}
        cx="21"
        cy="21"
        r="15.915"
        strokeDasharray={`${arc.length} ${100 - arc.length}`}
        strokeDashoffset={arc.offset}
      />)}
    </svg>
    <ul className={styles.legend}>
      {slices.map((slice, index) => <li key={slice.key} style={{ color: seriesColor(index) }}>
        <span className={styles.dot} />
        <span>{groupKeyLabel(view.groupBy, slice.key)}</span>
        <strong>{measureValueLabel(view.measure, slice.value)}</strong>
        <small>{Math.round(slice.share * 100)}%</small>
      </li>)}
    </ul>
  </div>
}

export function WorkspaceChart({ view }: { view: WorkspaceChartView }) {
  const definition = workspaceDatasetDefinitions[view.dataset]
  const facts = useQuery({
    queryKey: ['workspace-facts', view.dataset, view.filters],
    queryFn: ({ signal }) => definition.facts(view.filters, signal),
  })

  if (facts.isPending) return <p className={styles.status}>Somando {definition.noun}…</p>
  if (facts.isError) return <p className={styles.error}>Não foi possível carregar {definition.noun}.</p>

  const slices = chartSlices(facts.data, view)
  if (slices.length === 0) return <p className={styles.status}>Nada encontrado com esses filtros.</p>

  return <div className={styles.chart}>
    {view.shape === 'bar' && <Bars slices={slices} view={view} />}
    {view.shape === 'line' && <Line slices={slices} view={view} />}
    {view.shape === 'pie' && <Pie slices={slices} view={view} />}
    <p className={styles.total}>
      Total: <strong>{measureValueLabel(view.measure, slicesTotal(slices))}</strong> em {slices.length} {slices.length === 1 ? 'grupo' : 'grupos'}
    </p>
  </div>
}
