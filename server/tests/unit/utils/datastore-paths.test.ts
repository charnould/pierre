import { describe, expect, test } from 'bun:test'
import { isAbsolute } from 'node:path'

import {
  datastorePaths,
  setDatastoreRoot,
  testDatastorePaths,
  testDatastoreRoot
} from '../../../utils/paths'

describe('datastore paths', () => {
  test('uses a stable absolute root', () => {
    const paths = datastorePaths()
    expect(isAbsolute(paths.database)).toBe(true)
    expect(paths.database).toEndWith('/server/datastores/datastore.sqlite')
    expect(paths.files).toEndWith('/server/datastores/files')
    expect(paths.knowledge).toEndWith('/server/datastores/knowledge')
  })

  test('overrides the root for tests', () => {
    const isolated = testDatastorePaths('paths')
    setDatastoreRoot(isolated.root)
    try {
      expect(datastorePaths()).toEqual(isolated)
      expect(isolated.root).toBe(testDatastoreRoot('paths'))
    } finally {
      setDatastoreRoot(null)
    }
    expect(datastorePaths().database).toEndWith('/server/datastores/datastore.sqlite')
  })
})
