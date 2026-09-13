import { describe, expect, it } from 'vitest'
import { applyViewToSearchParams, viewFromSearchParams } from './workspace.url'
import type { WorkspaceView } from './workspace.commands'

function url(view: WorkspaceView): string {
  return applyViewToSearchParams(new URLSearchParams('chat=chat-1'), view).toString()
}

describe('workspace links', () => {
  it('keeps page, filters and entity in the address', () => {
    expect(url({ kind: 'table', dataset: 'expenses', filters: { from: '2026-03-01', to: '2026-03-31', category: 'FUEL' } }))
      .toBe('chat=chat-1&view=expenses&from=2026-03-01&to=2026-03-31&category=FUEL')
    expect(url({ kind: 'entity', entityType: 'cattleLot', entityId: 'seed-lot-12' }))
      .toBe('chat=chat-1&view=cattleLot&entity=seed-lot-12')
  })

  it('resolves a link back into the same view', () => {
    const view: WorkspaceView = { kind: 'table', dataset: 'revenues', filters: { from: '2026-03-01' } }

    expect(viewFromSearchParams(new URLSearchParams(url(view)))).toEqual(view)
  })

  it('drops the panel from the address when nothing is open, keeping the conversation', () => {
    const params = applyViewToSearchParams(new URLSearchParams('chat=chat-1&view=expenses&from=2026-03-01'), null)

    expect(params.toString()).toBe('chat=chat-1')
  })

  it('ignores an address that asks for something the panel cannot show', () => {
    expect(viewFromSearchParams(new URLSearchParams('chat=chat-1'))).toBeNull()
    expect(viewFromSearchParams(new URLSearchParams('view=weather'))).toBeNull()
    expect(viewFromSearchParams(new URLSearchParams('view=expenses&from=ontem'))).toBeNull()
  })
})
