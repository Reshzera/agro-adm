import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_HISTORY_LIMIT,
  emptyWorkspace,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from './workspace.reducer'
import type { WorkspaceView } from './workspace.commands'

function table(from: string): WorkspaceView {
  return { kind: 'table', dataset: 'expenses', filters: { from } }
}

const lot: WorkspaceView = { kind: 'entity', entityType: 'cattleLot', entityId: 'seed-lot-12' }

function openAll(views: WorkspaceView[], state: WorkspaceState = emptyWorkspace): WorkspaceState {
  return views.reduce((current, view) => workspaceReducer(current, { type: 'open', view }), state)
}

describe('workspace reducer', () => {
  it('shows one view at a time and keeps the replaced one for going back', () => {
    const state = openAll([table('2026-03-01'), table('2026-02-01')])

    expect(state.current).toEqual(table('2026-02-01'))
    expect(state.history).toEqual([table('2026-03-01')])
  })

  it('does not stack the first view into history', () => {
    expect(openAll([table('2026-03-01')]).history).toEqual([])
  })

  it('treats a repeated command as the same view instead of a new one', () => {
    const opened = openAll([table('2026-03-01')])
    const again = workspaceReducer(opened, { type: 'open', view: table('2026-03-01') })

    expect(again).toBe(opened)
    expect(again.history).toEqual([])
  })

  it('goes back to the previous view', () => {
    const state = workspaceReducer(openAll([table('2026-03-01'), lot]), { type: 'back' })

    expect(state.current).toEqual(table('2026-03-01'))
    expect(state.history).toEqual([])
  })

  it('has nothing to go back to when nothing was replaced', () => {
    const opened = openAll([table('2026-03-01')])

    expect(workspaceReducer(opened, { type: 'back' })).toBe(opened)
    expect(workspaceReducer(emptyWorkspace, { type: 'back' })).toBe(emptyWorkspace)
  })

  it('bounds the history', () => {
    const views = Array.from({ length: WORKSPACE_HISTORY_LIMIT + 5 }, (_, index) =>
      table(`2026-03-${String(index + 1).padStart(2, '0')}`),
    )
    const state = openAll(views)

    expect(state.history).toHaveLength(WORKSPACE_HISTORY_LIMIT)
    expect(state.history[0]).toEqual(views[4])
    expect(state.current).toEqual(views[views.length - 1])
  })

  it('restores a view from a link without inventing a history', () => {
    const state = workspaceReducer(openAll([table('2026-03-01'), lot]), { type: 'restore', view: table('2026-01-01') })

    expect(state.current).toEqual(table('2026-01-01'))
    expect(state.history).toEqual([])
  })

  it('leaves the state alone when the action is not one it knows', () => {
    const opened = openAll([table('2026-03-01')])

    expect(workspaceReducer(opened, { type: 'set_filters' } as unknown as WorkspaceAction)).toBe(opened)
  })
})
