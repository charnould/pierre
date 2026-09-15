import { expect, it } from 'bun:test'

import { safeLoginRedirect } from '../../../../controllers/auth/get.login'

it('accepts local login redirects and rejects external destinations', () => {
  expect(safeLoginRedirect('/c?config=demo&data=tenant')).toBe('/c?config=demo&data=tenant')
  expect(safeLoginRedirect('/desktop/module#item')).toBe('/desktop/module#item')
  expect(safeLoginRedirect('https://example.com')).toBe('/c?config=default&data=')
  expect(safeLoginRedirect('//example.com')).toBe('/c?config=default&data=')
  expect(safeLoginRedirect('/\\example.com')).toBe('/c?config=default&data=')
})
