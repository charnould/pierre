import { expect, it } from 'bun:test'
import { split_markdown_into_chunks } from '../../../utils/knowledge/chunk-markdown'

it('should split markdown into chunks', async () => {
  const file = Bun.file('tests/unit/utils/__mocks__/markdown-file.md')
  const file_content = await file.text()

  const r = await split_markdown_into_chunks(file_content)
  expect(r.length).toBe(2)
  expect(r[0]).toMatchSnapshot()
  expect(r[1]).toMatchSnapshot()
})
