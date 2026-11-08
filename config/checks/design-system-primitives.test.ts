import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

import { Glob } from 'bun'

const root = resolve(import.meta.dir, '../..')
const desktopSrc = resolve(root, 'desktop/src')

// A raw control is allowed only when no shadcn primitive can carry the documented anatomy.
const allowedRawControls = new Map<string, 'button' | 'file-input' | 'render-button'>([
  ['desktop/src/features/home/HomeDoor.tsx', 'button'],
  ['desktop/src/features/home/HomeActionBuckets.tsx', 'button'],
  ['desktop/src/features/chat/components/ChatPublicEmpty.tsx', 'button'],
  ['desktop/src/shared/components/inspector/open-actions-card.tsx', 'button'],
  ['desktop/src/shared/components/ChoiceTile.tsx', 'render-button'],
  ['desktop/src/shared/components/timeline/timeline-communication-envelope.tsx', 'render-button'],
  ['desktop/src/features/repayment/plan/sections/schedule.tsx', 'render-button'],
  ['desktop/src/features/about/components/AboutAttachmentField.tsx', 'file-input'],
  ['desktop/src/features/administration/components/SetupPanel.tsx', 'file-input'],
  ['desktop/src/features/chat/components/ChatComposer.tsx', 'file-input'],
  ['desktop/src/features/repayment/components/RepaymentComposeBlock.tsx', 'file-input'],
  ['desktop/src/features/tickets/components/TicketComposeBlock.tsx', 'file-input']
])

const primitiveHint =
  'Use the primitive from @/shared/components/ui. Extend this allowlist only for a pattern named in desktop/DESIGN.md.'

function sourceWithoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function openingTag(source: string, start: number): string {
  for (let index = start; index < source.length; index++) {
    if (source[index] === '>' && source[index - 1] !== '=') return source.slice(start, index + 1)
  }
  return source.slice(start)
}

function rawControls(source: string): Array<{ tag: string; opening: string }> {
  const controls: Array<{ tag: string; opening: string }> = []
  const pattern = /<(button|input|textarea|select|dialog)\b/g
  for (const match of source.matchAll(pattern)) {
    const tag = match[1]
    if (!tag || match.index === undefined) continue
    controls.push({ tag, opening: openingTag(source, match.index) })
  }
  return controls
}

test('features compose shadcn primitives instead of bypassing them', async () => {
  const violations: string[] = []
  const seen = new Set<string>()
  const files = new Glob('**/*.{ts,tsx}')

  for await (const file of files.scan({ cwd: desktopSrc })) {
    const path = `desktop/src/${file}`
    const source = sourceWithoutComments(await Bun.file(resolve(desktopSrc, file)).text())
    const primitiveImplementation =
      path.startsWith('desktop/src/shared/components/ui/') ||
      path.startsWith('desktop/src/shared/components/reui/')
    const mascot = path.startsWith('desktop/src/mascot/')
    const testFile = path.endsWith('.test.ts') || path.endsWith('.test.tsx')

    if (!primitiveImplementation && /from ['"]@base-ui\/react/.test(source)) {
      violations.push(
        `${path} imports @base-ui/react directly. Import the Pierre primitive from @/shared/components/ui instead.`
      )
    }

    if (primitiveImplementation || mascot || testFile) continue

    const controls = rawControls(source)
    if (controls.length === 0) continue
    seen.add(path)
    const kind = allowedRawControls.get(path)
    if (!kind) {
      const tags = [...new Set(controls.map((control) => control.tag))].join(', ')
      violations.push(`${path} uses raw <${tags}>. ${primitiveHint}`)
      continue
    }

    if (kind === 'file-input') {
      const invalid = controls.filter(
        (control) =>
          control.tag !== 'input' ||
          !/type=["']file["']/.test(control.opening) ||
          !/\bsr-only\b/.test(control.opening)
      )
      if (invalid.length > 0) {
        violations.push(
          `${path} may only contain an invisible file input (type="file" and sr-only). ${primitiveHint}`
        )
      }
      continue
    }

    if (controls.some((control) => control.tag !== 'button')) {
      violations.push(`${path} may only contain a raw <button>. ${primitiveHint}`)
    }
  }

  for (const path of allowedRawControls.keys()) {
    if (!seen.has(path)) violations.push(`${path} no longer needs a raw-control allowlist entry.`)
  }

  expect(violations).toEqual([])
})
