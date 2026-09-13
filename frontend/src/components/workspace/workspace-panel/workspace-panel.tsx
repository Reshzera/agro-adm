import { useQuery } from '@tanstack/react-query'
import {
  datasetForEntity,
  entityForDataset,
  type WorkspaceEntityView,
  type WorkspaceTableView,
  type WorkspaceView,
} from '../../../workspace/workspace.commands'
import { useWorkspace, workspaceStore } from '../../../workspace/workspace.store'
import { filterSummary, workspaceDatasetDefinitions, type WorkspaceRow } from '../workspace.datasets'
import styles from './workspace-panel.module.scss'

function useRows(view: WorkspaceView) {
  const dataset = view.kind === 'table' ? view.dataset : datasetForEntity(view.entityType)
  const filters = view.kind === 'table' ? view.filters : {}
  return useQuery({
    queryKey: ['workspace', dataset, filters],
    queryFn: ({ signal }) => workspaceDatasetDefinitions[dataset].load(filters, signal),
  })
}

function openEntity(row: WorkspaceRow, view: WorkspaceTableView) {
  workspaceStore.dispatch({
    type: 'open',
    view: { kind: 'entity', entityType: entityForDataset(view.dataset), entityId: row.id },
  })
}

function WorkspaceTable({ view }: { view: WorkspaceTableView }) {
  const definition = workspaceDatasetDefinitions[view.dataset]
  const rows = useRows(view)

  if (rows.isPending) return <p className={styles.status}>Buscando {definition.noun}…</p>
  if (rows.isError) return <p className={styles.error}>Não foi possível carregar {definition.noun}.</p>
  if (rows.data.length === 0) return <p className={styles.status}>Nada encontrado com esses filtros.</p>

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
  const rows = useRows(view)
  const row = rows.data?.find((item) => item.id === view.entityId)

  if (rows.isPending) return <p className={styles.status}>Abrindo o registro…</p>
  if (rows.isError) return <p className={styles.error}>Não foi possível carregar este registro.</p>
  if (!row) return <p className={styles.status}>Este registro não está mais na fazenda.</p>

  return <dl className={styles.fields}>
    {row.details.map((field) => <div key={field.label}>
      <dt>{field.label}</dt>
      <dd>{field.value}</dd>
    </div>)}
  </dl>
}

function heading(view: WorkspaceView): { title: string; subtitle: string } {
  if (view.kind === 'entity')
    return {
      title: workspaceDatasetDefinitions[datasetForEntity(view.entityType)].singular,
      subtitle: 'ficha do registro',
    }
  const definition = workspaceDatasetDefinitions[view.dataset]
  return {
    title: view.title ?? definition.label,
    subtitle: definition.usesFilters ? filterSummary(view.filters) || 'sem filtro' : 'tudo que está cadastrado',
  }
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
      <button
        type="button"
        onClick={() => workspaceStore.dispatch({ type: 'back' })}
        disabled={history.length === 0}
      >
        Voltar
      </button>
    </header>
    {current === null
      ? <p className={styles.blank}>Peça os números no chat — a tabela abre aqui e a conversa fica só com a resposta.</p>
      : current.kind === 'table' ? <WorkspaceTable view={current} /> : <WorkspaceEntity view={current} />}
  </aside>
}
