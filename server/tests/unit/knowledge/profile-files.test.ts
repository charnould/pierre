import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { writeProfileFiles } from '../../../utils/knowledge/profile-files'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'
import { writeSetup } from '../../../utils/setup-store'

const paths = testDatastorePaths('profile_files')

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('report profile files', () => {
  it('writes the consigne and the example only', async () => {
    await writeSetup('automations/AGENTS.md', new TextEncoder().encode('Consignes du rapport.'))
    await writeProfileFiles('report')

    const dir = join(paths.knowledge, 'report')
    expect(await Bun.file(join(dir, 'AGENTS.md')).text()).toContain('Consignes du rapport')
    const example = await Bun.file(join(dir, 'example.html')).text()
    expect(example).toContain('<article class="report">')
    expect(example).not.toContain('CONTRACT.md')
    expect(await Bun.file(join(dir, 'pierre-report.css')).exists()).toBe(false)
    expect(await Bun.file(join(dir, 'pierre-report-boot.js')).exists()).toBe(false)
    expect(await Bun.file(join(dir, 'CONTRACT.md')).exists()).toBe(false)
  })
})
