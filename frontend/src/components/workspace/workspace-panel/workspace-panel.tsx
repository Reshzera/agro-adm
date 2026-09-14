import { useQuery } from '@tanstack/react-query'
import {
  datasetForEntity,
  entityForDataset,
  groupingLabels,
  measureLabels,
  type WorkspaceEntityView,
  type WorkspaceTableView,
  type WorkspaceView,
} from '../../../workspace/workspace.commands'
import { WorkspaceMap } from '../workspace-map/workspace-map'
import { useWorkspace, workspaceStore } from '../../../workspace/workspace.store'
import { attentionEndpoints } from '../../../service/attention'
import {
  filterSummary,
  workspaceDatasetDefinitions,
  type WorkspaceRow,
  type WorkspaceRowLink,
} from '../workspace.datasets'
import { WorkspaceChart } from '../workspace-chart/workspace-chart'
import styles from './workspace-panel.module.scss'

function useRows(view: WorkspaceTableView) {
  return useQuery({
    queryKey: ['workspace', view.dataset, view.filters],
    queryFn: ({ signal }) => workspaceDatasetDefinitions[view.dataset].load(view.filters, signal),
  })
}

function useEntity(view: WorkspaceEntityView) {
  const dataset = datasetForEntity(view.entityType)
  const definition = workspaceDatasetDefinitions[dataset]
  return useQuery({
    queryKey: ['workspace', 'entity', dataset, view.entityId],
    queryFn: async ({ signal }): Promise<WorkspaceRow | null> => {
      if (definition.detail) return definition.detail(view.entityId, signal)
      const rows = await definition.load({}, signal)
      return rows.find((row) => row.id === view.entityId) ?? null
    },
  })
}

function openEntity(row: WorkspaceRow, view: WorkspaceTableView) {
  workspaceStore.dispatch({
    type: 'open',
    view: { kind: 'entity', entityType: entityForDataset(view.dataset), entityId: row.id },
  })
}

function openLink(link: WorkspaceRowLink) {
  workspaceStore.dispatch({
    type: 'open',
    view: { kind: 'entity', entityType: link.entityType, entityId: link.entityId },
  })
}

function WorkspaceTable({ view }: { view: WorkspaceTableView }) {
  const definition = workspaceDatasetDefinitions[view.dataset]
  const rows = useRows(view)

  if (rows.isPending) return <p className={styles.status}>Buscando {definition.noun}…</p>
  if (rows.isError) return <p className={styles.error}>Não foi possível carregar {definition.noun}.</p>
  if (rows.data.length === 0) return <p className={styles.status}>{view.dataset === 'attentionItems' ? 'Nada pedindo atenção agora.' : 'Nada encontrado com esses filtros.'}</p>

  return <div className={styles.tableWrap}>
    <table className={styles.table}>
      <thead>
        <tr>{definition.columns.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.data.map((row) => <tr
          key={row.id}
          tabIndex={0}
          role="button"
          data-tone={row.tone}
          onClick={() => openEntity(row, view)}
          onKeyDown={(event) => { if (event.key === 'Enter') openEntity(row, view) }}
        >
          {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
        </tr>)}
      </tbody>
    </table>
  </div>
}

function WorkspaceEntity({ view }: { view: WorkspaceEntityView }) {
  const entity = useEntity(view)

  if (entity.isPending) return <p className={styles.status}>Abrindo o registro…</p>
  if (entity.isError) return <p className={styles.error}>Não foi possível carregar este registro.</p>
  if (!entity.data) return <p className={styles.status}>Este registro não está mais na fazenda.</p>

  return <div className={styles.record}>
    <dl className={styles.fields}>
      {entity.data.details.map((field, index) => <div key={index}>
        <dt>{field.label}</dt>
        <dd>{field.value}</dd>
      </div>)}
    </dl>
    {entity.data.links?.length ? <nav className={styles.links}>
      {entity.data.links.map((link) => <button key={link.entityId} type="button" onClick={() => openLink(link)}>
        {link.label}
      </button>)}
    </nav> : null}
  </div>
}

function AttentionBadge() {
  const items = useQuery({
    queryKey: ['workspace', 'attentionItems', {}],
    queryFn: async ({ signal }) => (await attentionEndpoints.items(signal)).data,
  })
  const open = items.data?.length ?? 0
  if (open === 0) return null

  return <button
    type="button"
    className={styles.badge}
    data-tone={items.data?.some((item) => item.severity === 'CRITICAL') ? 'critical' : 'warning'}
    onClick={() => workspaceStore.dispatch({
      type: 'open',
      view: { kind: 'table', dataset: 'attentionItems', filters: {} },
    })}
  >
    Atenção · {open}
  </button>
}

function heading(view: WorkspaceView): { title: string; subtitle: string } {
  if (view.kind === 'map')
    return {
      title: view.title ?? 'Mapa da fazenda',
      subtitle: view.paddockIds.length
        ? `${view.paddockIds.length} ${view.paddockIds.length === 1 ? 'pasto enquadrado' : 'pastos enquadrados'}`
        : 'todos os pastos com contorno',
    }
  if (view.kind === 'entity')
    return {
      title: workspaceDatasetDefinitions[datasetForEntity(view.entityType)].singular,
      subtitle: view.entityType === 'attentionItem' ? 'explicação gravada, sem modelo' : 'ficha do registro',
    }
  const definition = workspaceDatasetDefinitions[view.dataset]
  const period = definition.usesFilters ? filterSummary(view.filters) || 'sem filtro' : 'tudo que está cadastrado'
  if (view.kind === 'chart')
    return {
      title: view.title ?? `${definition.label} por ${groupingLabels[view.groupBy]}`,
      subtitle: `${measureLabels[view.measure]} · ${period}`,
    }
  if (view.dataset === 'attentionItems')
    return { title: view.title ?? definition.label, subtitle: 'do mais grave para o menos grave' }
  return { title: view.title ?? definition.label, subtitle: period }
}

export function WorkspacePanel() {
  const { current, history } = useWorkspace()
  const { title, subtitle } = current
    ? heading(current)
    : { title: 'Painel', subtitle: 'o que você pedir aparece aqui' }

  return <aside className={styles.panel} aria-label="Painel da fazenda">
    <header className={styles.head}>
      <div>
        <h2>{title}</h2>
        <small>{subtitle}</small>
      </div>
      <div className={styles.actions}>
        <AttentionBadge />
        <button
          type="button"
          onClick={() => workspaceStore.dispatch({ type: 'back' })}
          disabled={history.length === 0}
        >
          Voltar
        </button>
      </div>
    </header>
    {current === null
      ? <p className={styles.blank}>Peça os números no chat — a tabela abre aqui e a conversa fica só com a resposta.</p>
      : current.kind === 'table' ? <WorkspaceTable view={current} />
        : current.kind === 'chart' ? <WorkspaceChart view={current} />
          : current.kind === 'map' ? <WorkspaceMap view={current} />
            : <WorkspaceEntity view={current} />}
  </aside>
}
