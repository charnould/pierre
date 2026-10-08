import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

const SRC = resolve(import.meta.dir, '../..')
const read = (path: string) => Bun.file(resolve(SRC, path)).text()

describe('desktop animation policy', () => {
  test('keeps frequent navigation and scroll affordances crisp', async () => {
    const [home, scroller] = await Promise.all([
      read('features/home/HomeView.tsx'),
      read('shared/components/ui/message-scroller.tsx')
    ])

    expect(home).not.toContain('transition-[opacity,translate]')
    expect(home).not.toContain('cubic-bezier(0.4,0,1,1)')
    expect(scroller).toContain('duration-160')
    expect(scroller).toContain('ease-pierre-out')
    expect(scroller).not.toContain('duration-400')
    expect(scroller).not.toContain('cubic-bezier(0.7,0,0.84,0)')
    expect(scroller).not.toContain('data-[active=false]:scale-95')
    expect(scroller).not.toContain('data-[active=false]:translate-y')
    expect(
      Bun.file(resolve(SRC, 'features/workflow/components/WorkflowPanelChrome.tsx')).size
    ).toBe(0)
  })

  test('limits owned primitives to explicit transition properties', async () => {
    const [tabs, switchSource, drawer, openActions] = await Promise.all([
      read('shared/components/ui/tabs.tsx'),
      read('shared/components/ui/switch.tsx'),
      read('shared/components/ui/drawer.tsx'),
      read('shared/components/inspector/open-actions-card.tsx')
    ])

    expect(tabs).not.toContain('transition-all')
    expect(tabs).toContain('transition-colors')
    expect(switchSource).not.toContain('transition-all')
    expect(switchSource).toContain('transition-colors')
    expect(switchSource).toContain('transition-transform')
    expect(switchSource).toContain('duration-160')
    expect(switchSource).toContain('ease-pierre-in-out')
    expect(switchSource).toContain('motion-reduce:transition-none')
    expect(drawer).toContain("variant === 'default'")
    expect(drawer.match(/transition-\[transform,opacity\]/g)).toHaveLength(2)
    expect(openActions).not.toContain('grid-template-rows')
    expect(openActions).not.toContain('rotateY')
  })

  test('keeps notification feedback short and pointer-aware', async () => {
    const [trigger, row] = await Promise.all([
      read('features/activity/components/ActivityNotificationsTrigger.tsx'),
      read('features/activity/components/ActivityNotificationRow.tsx')
    ])

    expect(trigger).toContain('duration: 300')
    expect(row).toContain('[@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100')
  })

  test('keeps métier door delight interruptible, pointer-only and composite-only', async () => {
    const [css, door] = await Promise.all([read('globals.css'), read('features/home/HomeDoor.tsx')])

    expect(css).toContain(
      '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    )
    expect(css).toContain('transform: translateY(-2px) scale(1.006)')
    expect(css).toContain('transform: translate3d(3px, -2px, 0) rotate(2deg)')
    expect(css).toContain('transition: transform 180ms var(--ease-pierre-out)')
    expect(css).toContain('transition: transform 220ms var(--ease-pierre-out)')
    expect(door).not.toContain('active:translate-y-px')
  })
})
