import { describe, expect, it, spyOn } from 'bun:test'

import { formatMarkdown } from '../../../utils/format-markdown'

describe('formatMarkdown', () => {
  it('returns empty without spawning bun fmt for blank input', async () => {
    const spawnSpy = spyOn(Bun, 'spawn')
    try {
      expect(await formatMarkdown('')).toBe('')
      expect(await formatMarkdown('  \n\t\r\n  ')).toBe('')
      expect(await formatMarkdown('\uFEFF   \n')).toBe('')
      expect(spawnSpy).not.toHaveBeenCalled()
    } finally {
      spawnSpy.mockRestore()
    }
  })

  it('formats markdown while preserving inline code, fences, and list continuations', async () => {
    const input = [
      '\uFEFF#   Titre',
      '',
      '-  item 1',
      '-   item 2',
      '',
      'Utiliser `a   b` ou `  `.',
      '',
      '- Pour un logement :  ',
      '  Suite indentée.',
      '',
      '```sql',
      'SELECT   1',
      '```',
      '',
      '```json',
      '{"a":1,"b":2}',
      '```'
    ].join('\n')

    expect(await formatMarkdown(input)).toBe(
      [
        '# Titre',
        '',
        '- item 1',
        '- item 2',
        '',
        'Utiliser `a   b` ou `  `.',
        '',
        '- Pour un logement :  ',
        '  Suite indentée.',
        '',
        '```sql',
        'SELECT   1',
        '```',
        '',
        '```json',
        '{"a":1,"b":2}',
        '```'
      ].join('\n') + '\n'
    )
  })

  it('throws when bun fmt exits non-zero', async () => {
    const spawnSpy = spyOn(Bun, 'spawn').mockReturnValue({
      stdout: new ReadableStream({
        start(controller) {
          controller.close()
        }
      }),
      stderr: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('formatter boom\n'))
          controller.close()
        }
      }),
      exited: Promise.resolve(1)
    } as never)
    try {
      await expect(formatMarkdown('# Titre')).rejects.toThrow('formatter boom')
    } finally {
      spawnSpy.mockRestore()
    }
  })
})
