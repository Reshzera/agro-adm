import { parseWorkspaceCommand, type WorkspaceView } from './workspace.commands'

const workspaceParams = [
  'view',
  'entity',
  'chart',
  'by',
  'measure',
  'paddocks',
  'from',
  'to',
  'category',
] as const

export function viewFromSearchParams(params: URLSearchParams): WorkspaceView | null {
  const view = params.get('view')
  if (!view) return null

  if (view === 'map') {
    const paddocks = params.get('paddocks')
    const parsed = parseWorkspaceCommand('openWorkspaceMap', {
      ...(paddocks ? { paddockIds: paddocks.split(',').filter(Boolean) } : {}),
    })
    return parsed.ok ? parsed.view : null
  }

  const entityId = params.get('entity')
  if (entityId) {
    const parsed = parseWorkspaceCommand('openWorkspaceEntity', { entityType: view, entityId })
    return parsed.ok ? parsed.view : null
  }

  const filters = {
    ...(params.get('from') ? { from: params.get('from') } : {}),
    ...(params.get('to') ? { to: params.get('to') } : {}),
    ...(params.get('category') ? { category: params.get('category') } : {}),
  }

  const shape = params.get('chart')
  if (shape) {
    const parsed = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: view,
      shape,
      groupBy: params.get('by'),
      measure: params.get('measure'),
      filters,
    })
    return parsed.ok ? parsed.view : null
  }

  const parsed = parseWorkspaceCommand('openWorkspaceTable', { dataset: view, filters })
  return parsed.ok ? parsed.view : null
}

export function applyViewToSearchParams(
  params: URLSearchParams,
  view: WorkspaceView | null,
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const param of workspaceParams) next.delete(param)
  if (!view) return next

  if (view.kind === 'entity') {
    next.set('view', view.entityType)
    next.set('entity', view.entityId)
    return next
  }

  if (view.kind === 'map') {
    next.set('view', 'map')
    if (view.paddockIds.length) next.set('paddocks', view.paddockIds.join(','))
    return next
  }

  next.set('view', view.dataset)
  if (view.kind === 'chart') {
    next.set('chart', view.shape)
    next.set('by', view.groupBy)
    next.set('measure', view.measure)
  }
  if (view.filters.from) next.set('from', view.filters.from)
  if (view.filters.to) next.set('to', view.filters.to)
  if (view.filters.category) next.set('category', view.filters.category)
  return next
}
