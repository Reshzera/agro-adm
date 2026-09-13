import type { WorkspaceFilters, WorkspaceView } from './workspace.commands'

export const WORKSPACE_HISTORY_LIMIT = 10

export type WorkspaceState = {
  current: WorkspaceView | null
  history: WorkspaceView[]
}

export type WorkspaceAction =
  | { type: 'open'; view: WorkspaceView }
  | { type: 'back' }
  | { type: 'restore'; view: WorkspaceView | null }

export const emptyWorkspace: WorkspaceState = { current: null, history: [] }

function sameFilters(a: WorkspaceFilters, b: WorkspaceFilters): boolean {
  return a.from === b.from && a.to === b.to && a.category === b.category
}

export function sameView(a: WorkspaceView | null, b: WorkspaceView | null): boolean {
  if (!a || !b) return a === b
  if (a.kind === 'table' && b.kind === 'table')
    return a.dataset === b.dataset && a.title === b.title && sameFilters(a.filters, b.filters)
  if (a.kind === 'entity' && b.kind === 'entity')
    return a.entityType === b.entityType && a.entityId === b.entityId
  return false
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'open': {
      if (sameView(state.current, action.view)) return state
      const history = state.current
        ? [...state.history, state.current].slice(-WORKSPACE_HISTORY_LIMIT)
        : state.history
      return { current: action.view, history }
    }
    case 'back': {
      const previous = state.history[state.history.length - 1]
      if (!previous) return state
      return { current: previous, history: state.history.slice(0, -1) }
    }
    case 'restore': {
      if (sameView(state.current, action.view)) return state
      return { current: action.view, history: [] }
    }
    default:
      return state
  }
}
