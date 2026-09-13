import { useSyncExternalStore } from 'react'
import {
  emptyWorkspace,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from './workspace.reducer'

export function createWorkspaceStore(initial: WorkspaceState = emptyWorkspace) {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    getState: (): WorkspaceState => state,
    dispatch(action: WorkspaceAction): WorkspaceState {
      const next = workspaceReducer(state, action)
      if (next === state) return state
      state = next
      for (const listener of listeners) listener()
      return state
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>

export const workspaceStore = createWorkspaceStore()

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(workspaceStore.subscribe, workspaceStore.getState)
}
