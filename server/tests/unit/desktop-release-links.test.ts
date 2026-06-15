import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const adminView = readFileSync(join(import.meta.dirname, '../../views/admin.index.ts'), 'utf8')

test('admin dashboard links to GitHub release artifacts', () => {
  expect(adminView).toContain('releases/latest/download/pierre-win32-setup.exe')
  expect(adminView).toContain('releases/latest/download/pierre-macos.dmg')
})

test('admin dashboard no longer links to legacy LFS config/app paths', () => {
  expect(adminView).not.toContain('config/app/')
})
