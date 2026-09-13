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

  it('accepts a chart command that states shape, grouping and measure', () => {
    const parsed = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: 'expenses',
      shape: 'bar',
      groupBy: 'category',
      measure: 'amount',
      title: 'Gasto por categoria',
      filters: { from: '2026-01-01', to: '2026-03-31' },
    })

    expect(parsed).toEqual({
      ok: true,
      view: {
        kind: 'chart',
        dataset: 'expenses',
        shape: 'bar',
        groupBy: 'category',
        measure: 'amount',
        title: 'Gasto por categoria',
        filters: { from: '2026-01-01', to: '2026-03-31' },
      },
    })
  })

  it('rejects a chart shape it cannot draw, saying which ones it draws', () => {
    const parsed = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: 'expenses',
      shape: 'scatter',
      groupBy: 'category',
      measure: 'amount',
    })

    expect(parsed.ok).toBe(false)
    expect(parsed).toHaveProperty('error', expect.stringContaining('bar, line, pie'))
  })

  it('rejects a shape that does not fit the grouping', () => {
    const line = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: 'expenses',
      shape: 'line',
      groupBy: 'category',
      measure: 'amount',
    })
    const pie = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: 'expenses',
      shape: 'pie',
      groupBy: 'month',
      measure: 'amount',
    })

    expect(line.ok).toBe(false)
    expect(line).toHaveProperty('error', expect.stringContaining('bar'))
    expect(pie.ok).toBe(false)
    expect(pie).toHaveProperty('error', expect.stringContaining('line'))
  })

  it('rejects a grouping or a measure the dataset does not have', () => {
    const grouping = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: 'revenues',
      shape: 'pie',
      groupBy: 'category',
      measure: 'amount',
    })
    const measure = parseWorkspaceCommand('openWorkspaceChart', {
      dataset: 'cattleLots',
      shape: 'bar',
      groupBy: 'paddock',
      measure: 'amount',
    })

    expect(grouping.ok).toBe(false)
    expect(grouping).toHaveProperty('error', expect.stringContaining('month'))
    expect(measure.ok).toBe(false)
    expect(measure).toHaveProperty('error', expect.stringContaining('headCount'))
  })

  it('rejects a chart command that leaves the presentation open', () => {
    expect(parseWorkspaceCommand('openWorkspaceChart', { dataset: 'expenses', shape: 'bar' }).ok).toBe(false)
    expect(
      parseWorkspaceCommand('openWorkspaceChart', {
        dataset: 'expenses',
        shape: 'bar',
        groupBy: 'category',
        measure: 'amount',
        stack: true,
      }).ok,
    ).toBe(false)
  })

  it('rejects an entity without an id', () => {
    expect(parseWorkspaceCommand('openWorkspaceEntity', { entityType: 'expense', entityId: '  ' }).ok).toBe(false)
    expect(parseWorkspaceCommand('openWorkspaceEntity', { entityType: 'tractor', entityId: 'x' }).ok).toBe(false)
  })
})
