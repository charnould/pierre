import { expect, it } from 'bun:test'
import { store_metadata } from '../../../../utils/knowledge/store-metadata'

it('should store correct metadata', async () => {
  const basepath = `./datastores/${Bun.env.SERVICE}`
  const to_delete = Bun.file(`${basepath}/metadata.json`)
  if (await to_delete.exists()) to_delete.delete()

  const xlsx1 = Bun.file('./tests/unit/utils/__mocks__/knowledge/_metadata_1.xlsx')

  await Bun.write(`${basepath}/files/_metadata.xlsx`, xlsx1)
  await Bun.write(`${basepath}/files/doc1.md`, 'doc1')
  await Bun.write(`${basepath}/files/doc2.md`, 'doc2')
  await Bun.write(`${basepath}/files/doc3.md`, 'doc3')

  await store_metadata({ proprietary: true, community: false })
  const metadata_1 = await Bun.file(`${basepath}/metadata.json`).json()
  expect(metadata_1).toMatchSnapshot()

  const xlsx2 = Bun.file('./tests/unit/utils/__mocks__/knowledge/_metadata_2.xlsx')
  await Bun.write(`${basepath}/files/_metadata.xlsx`, xlsx2)
  await store_metadata({ proprietary: true, community: false })

  const metadata_2 = await Bun.file(`${basepath}/metadata.json`).json()
  expect(metadata_2).toMatchSnapshot()

  await Bun.write(`${basepath}/files/doc1.md`, 'doc1')
  await store_metadata({ proprietary: true, community: false })
  const metadata_3 = await Bun.file(`${basepath}/metadata.json`).json()
  expect(metadata_3).toMatchSnapshot()

  await Bun.write(`${basepath}/files/doc1.md`, 'doc1 bis')
  await store_metadata({ proprietary: true, community: false })
  const metadata_4 = await Bun.file(`${basepath}/metadata.json`).json()
  expect(metadata_4).toMatchSnapshot()
})
