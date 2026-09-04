import { expect, it } from 'bun:test'

import { createE2EView, currentUrl, navigate } from './launch-browser'

it('returns JSON for unknown communication API routes instead of redirecting to chat', async () => {
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

it('should redirect to the default config for invalid paths and parameters + preserve valid config/data pairs', async () => {
  await using view = createE2EView()

  // Accessing base `/c` route with no parameters or completely invalid
  // paths should redirect to default config with empty data
  await navigate(view, 'http://localhost:3000/c')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')

  await navigate(view, 'http://localhost:3000/wrong_path')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')

  await navigate(view, 'http://localhost:3000/c/wrong_path')
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')

  const path = 'http://localhost:3000/c'

  // Using invalid or missing config/context query
  // parameters should fallback to default config
  await navigate(view, `${path}?config=wrong_config`)
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')

  await navigate(view, `${path}?config=wrong_config&context=wrong_context`)
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')

  // Providing a valid config but missing data should
  // still resolve properly, adding an empty data param

  await navigate(view, `${path}?config=default`)
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=')

  // Missing config but valid data should fallback
  // to default config while preserving data

  await navigate(view, `${path}?data=test`)
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=default&data=test')

  // Valid config and data pair
  // should be preserved as-is
  await navigate(view, `${path}?config=demo&data=test`)
  expect(await currentUrl(view)).toBe('http://localhost:3000/c?config=demo&data=test')
})
