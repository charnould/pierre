import { expect, it } from 'bun:test'
import { readdir } from 'node:fs/promises'

import { $ } from 'bun'

it('should upload knowledge files with cURL successfully', async () => {
  // Remove mock files from datastore
  await $`rm -rf ./datastores/${Bun.env['SERVICE']}/files`
  await $`mkdir -p ./datastores/${Bun.env['SERVICE']}/files/`

  const { stdout } =
    await $`curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/a/knowledge \
  -H "Authorization: Bearer ${Bun.env['AUTH_BEARER']}" \
  -H "Authorization-Context: cli" \
  -H "Accept: application/json" \
  -F "service=${Bun.env['SERVICE']}" \
  -F "files[]=@tests/e2e/mock-files/excel.xlsx" \
  -F "files[]=@tests/e2e/mock-files/word.docx"
  `
  expect(stdout.toString().trim()).toBe('200')

  const files = await readdir(`datastores/${Bun.env['SERVICE']}/files`)
  expect(files).toStrictEqual(['ZXhjZWw.xlsx', 'd29yZA.docx'])

  // Remove mock files from datastore
  await $`rm -rf ./datastores/${Bun.env['SERVICE']}/files`
  await $`mkdir -p ./datastores/${Bun.env['SERVICE']}/files/`
})
