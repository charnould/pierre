import { describe, expect, test } from 'bun:test'

import { useSyncedHorizontalScroll } from './use-synced-horizontal-scroll'

function ScrollPair() {
  const { headerScrollRef, bodyScrollRef, onHeaderScroll, onBodyScroll } =
    useSyncedHorizontalScroll()
  return (
    <>
      <div data-testid="header" ref={headerScrollRef} onScroll={onHeaderScroll} />
      <div data-testid="body" ref={bodyScrollRef} onScroll={onBodyScroll} />
    </>
  )
}

describe('useSyncedHorizontalScroll', () => {
  test('synchronise le header et le body dans les deux sens', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => root.render(<ScrollPair />))
    const header = container.querySelector<HTMLElement>('[data-testid="header"]')!
    const body = container.querySelector<HTMLElement>('[data-testid="body"]')!

    await act(async () => {
      header.scrollLeft = 120
      header.dispatchEvent(new window.Event('scroll', { bubbles: true }))
    })
    expect(body.scrollLeft).toBe(120)

    await act(async () => {
      body.scrollLeft = 48
      body.dispatchEvent(new window.Event('scroll', { bubbles: true }))
    })
    expect(header.scrollLeft).toBe(48)

    await act(async () => root.unmount())
    container.remove()
  })
})
