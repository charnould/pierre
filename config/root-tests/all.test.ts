import { test } from 'bun:test'

import { runSuites } from '../test'

test('all repository suites pass', async () => {
  await runSuites(['shared', 'cli', 'docs', 'server', 'desktop'])
}, 180_000)
