import { expect, test } from 'bun:test'

import instanceConfig from '../../customization/config'

test('instance name is a non-empty string', () => {
  expect(typeof instanceConfig.name).toBe('string')
  expect(instanceConfig.name.trim().length).toBeGreaterThan(0)
})

test('instance timezone is a non-empty IANA identifier', () => {
  expect(typeof instanceConfig.timezone).toBe('string')
  expect(instanceConfig.timezone.trim().length).toBeGreaterThan(0)
  expect(() =>
    Intl.DateTimeFormat(undefined, { timeZone: instanceConfig.timezone.trim() })
  ).not.toThrow()
})
