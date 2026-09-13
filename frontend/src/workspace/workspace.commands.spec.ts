import { describe, expect, it } from 'vitest'
import { parseWorkspaceCommand } from './workspace.commands'

describe('workspace command validation', () => {
  it('accepts a table command that states the whole view', () => {
    const parsed = parseWorkspaceCommand('openWorkspaceTable', {
      dataset: 'expenses',
      title: 'Despesas de março',
      filters: { from: '2026-03-01', to: '2026-03-31', category: 'FUEL' },
    })

    expect(parsed).toEqual({
      ok: true,
      view: {
        kind: 'table',
        dataset: 'expenses',
        title: 'Despesas de março',
        filters: { from: '2026-03-01', to: '2026-03-31', category: 'FUEL' },
      },
    })
  })

  it('accepts a command without filters as a view without filters', () => {
    const parsed = parseWorkspaceCommand('openWorkspaceTable', { dataset: 'paddocks' })

    expect(parsed).toEqual({ ok: true, view: { kind: 'table', dataset: 'paddocks', filters: {} } })
  })

  it('accepts an entity command', () => {
    const parsed = parseWorkspaceCommand('openWorkspaceEntity', {
      entityType: 'cattleLot',
      entityId: 'seed-lot-12',
    })

    expect(parsed).toEqual({ ok: true, view: { kind: 'entity', entityType: 'cattleLot', entityId: 'seed-lot-12' } })
  })

  it('rejects a command it does not recognise', () => {
    const parsed = parseWorkspaceCommand('setWorkspaceFilters', { filters: { category: 'FUEL' } })

    expect(parsed.ok).toBe(false)
    expect(parsed).toHaveProperty('error', expect.stringContaining('setWorkspaceFilters'))
  })

  it('rejects a change expressed against what is on screen', () => {
    expect(parseWorkspaceCommand('openWorkspaceTable', { dataset: 'expenses', addFilter: { category: 'FUEL' } }).ok).toBe(false)
    expect(parseWorkspaceCommand('openWorkspaceTable', { filters: { category: 'FUEL' } }).ok).toBe(false)
  })

  it('rejects a dataset, a category or a date it cannot render', () => {
    expect(parseWorkspaceCommand('openWorkspaceTable', { dataset: 'weather' }).ok).toBe(false)
    expect(parseWorkspaceCommand('openWorkspaceTable', { dataset: 'expenses', filters: { category: 'DIESEL' } }).ok).toBe(false)
    expect(parseWorkspaceCommand('openWorkspaceTable', { dataset: 'expenses', filters: { from: 'semana passada' } }).ok).toBe(false)
  })

  it('rejects an entity without an id', () => {
    expect(parseWorkspaceCommand('openWorkspaceEntity', { entityType: 'expense', entityId: '  ' }).ok).toBe(false)
    expect(parseWorkspaceCommand('openWorkspaceEntity', { entityType: 'tractor', entityId: 'x' }).ok).toBe(false)
  })
})
