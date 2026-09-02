import { describe, expect, test } from 'bun:test'
import { isAbsolute } from 'node:path'

import { datastorePaths, resolveServiceName } from '../../../utils/paths'

describe('datastore paths', () => {
  test('uses a stable absolute root for a valid service', () => {
    const paths = datastorePaths('acme-prod')
    expect(isAbsolute(paths.database)).toBe(true)
    expect(paths.database).toEndWith('/server/datastores/acme-prod/datastore.sqlite')
    expect(paths.files).toEndWith('/server/datastores/acme-prod/files')
    expect(paths.knowledge).toEndWith('/server/datastores/acme-prod/knowledge')
  })

  test('defaults only an undefined service', () => {
    expect(resolveServiceName(undefined)).toBe('default')
    expect(() => resolveServiceName('')).toThrow('Invalid SERVICE name')
    expect(() => resolveServiceName('   ')).toThrow('Invalid SERVICE name')
  })

  test('rejects paths and traversal segments', () => {
    for (const service of ['../prod', 'foo/bar', '/tmp/data', 'foo..bar']) {
      expect(() => resolveServiceName(service)).toThrow('Invalid SERVICE name')
    }
  })
})
