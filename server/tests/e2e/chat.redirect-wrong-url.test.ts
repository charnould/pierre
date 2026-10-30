import { expect, it } from 'bun:test'

import { createE2EView, currentUrl, e2eUrl, evaluate, navigate } from './launch-browser'

it('returns JSON for unknown communication API routes instead of the empty page', async () => {
  const response = await fetch(e2eUrl('/communications/unknown'), {
    method: 'POST',
    redirect: 'manual'
  })

  expect(response.status).toBe(404)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(await response.json()).toEqual({
    error: {
      code: 'not_found',
      message: 'Not found'
    }
  })
})

it('returns the empty page for unknown HTML paths', async () => {
  await using view = createE2EView()

  await navigate(view, e2eUrl('/wrong_path'))
  expect(await currentUrl(view)).toBe(e2eUrl('/wrong_path'))
  expect(
    await evaluate<boolean>(view, 'Boolean(document.querySelector(\'img[src="/assets/404.svg"]\'))')
  ).toBe(true)

  await navigate(view, e2eUrl('/c'))
  expect(await currentUrl(view)).toBe(e2eUrl('/c'))
  expect(
    await evaluate<boolean>(view, 'Boolean(document.querySelector(\'img[src="/assets/404.svg"]\'))')
  ).toBe(true)
})
