import { expect, test } from 'bun:test'

test('start.ts exposes the Bun server default export', async () => {
  const source = await Bun.file(new URL('../../start.ts', import.meta.url)).text()
  expect(source.trim()).toBe("export { default } from './app'")
})
