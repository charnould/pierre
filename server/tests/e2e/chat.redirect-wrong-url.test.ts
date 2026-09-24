import { expect, it } from 'bun:test'

import { createE2EView, currentUrl, evaluate, navigate } from './launch-browser'

it('returns JSON for unknown communication API routes instead of the empty page', async () => {
  const response = await fetch('http://localhost:3000/communications/unknown', {
    method: 'POST',
    redirect: 'manual'
  })

  expect(response.status).toBe(404)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(await response.json()).toEqual({
    error: {
      code: 'not_found',
      message: 'Communication endpoint not found'
    }
  })
})

it('returns the empty page for unknown HTML paths', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/wrong_path')
  expect(await currentUrl(view)).toBe('http://localhost:3000/wrong_path')
  expect(
    await evaluate<boolean>(view, 'Boolean(document.querySelector(\'img[src="/assets/404.svg"]\'))')
  ).toBe(true)

  await navigate(view, 'http://localhost:3000/c')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c')
  expect(
    await evaluate<boolean>(view, 'Boolean(document.querySelector(\'img[src="/assets/404.svg"]\'))')
  ).toBe(true)
})
