import { describe, expect, it } from 'vitest'
import { chartSlices, pieArcs, slicesTotal, type WorkspaceFact } from './workspace.series'

const facts: WorkspaceFact[] = [
  { keys: { category: 'FUEL', month: '2026-01' }, values: { amount: 1200, count: 1 } },
  { keys: { category: 'LABOR', month: '2026-03' }, values: { amount: 4000, count: 1 } },
  { keys: { category: 'FUEL', month: '2026-02' }, values: { amount: 800, count: 1 } },
]

describe('workspace chart series', () => {
  it('sums the query result by group instead of trusting a single row', () => {
    expect(chartSlices(facts, { groupBy: 'category', measure: 'amount' })).toEqual([
      { key: 'LABOR', value: 4000, share: 4000 / 6000 },
      { key: 'FUEL', value: 2000, share: 2000 / 6000 },
    ])
  })

  it('counts lançamentos when the measure is the count', () => {
    expect(chartSlices(facts, { groupBy: 'category', measure: 'count' })).toEqual([
      { key: 'FUEL', value: 2, share: 2 / 3 },
      { key: 'LABOR', value: 1, share: 1 / 3 },
    ])
  })

  it('keeps a period in chronological order and the rest by size', () => {
    expect(chartSlices(facts, { groupBy: 'month', measure: 'amount' }).map((slice) => slice.key))
      .toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('ignores facts that do not carry the grouping', () => {
    expect(chartSlices(facts, { groupBy: 'paddock', measure: 'amount' })).toEqual([])
  })

  it('has no share to divide when everything is zero', () => {
    const empty: WorkspaceFact[] = [{ keys: { category: 'FUEL' }, values: { amount: 0 } }]

    expect(chartSlices(empty, { groupBy: 'category', measure: 'amount' })).toEqual([
      { key: 'FUEL', value: 0, share: 0 },
    ])
  })

  it('lays the pizza slices one after the other around the whole circle', () => {
    const arcs = pieArcs(chartSlices(facts, { groupBy: 'category', measure: 'amount' }))

    expect(arcs.map((arc) => arc.key)).toEqual(['LABOR', 'FUEL'])
    expect(arcs[0].length).toBeCloseTo(4000 / 60)
    expect(arcs[0].offset).toBeCloseTo(25)
    expect(arcs[1].length).toBeCloseTo(2000 / 60)
    expect(arcs[1].offset).toBeCloseTo(25 - 4000 / 60)
    expect(arcs.reduce((sum, arc) => sum + arc.length, 0)).toBeCloseTo(100)
  })

  it('totals what is drawn', () => {
    expect(slicesTotal(chartSlices(facts, { groupBy: 'month', measure: 'amount' }))).toBe(6000)
  })
})
