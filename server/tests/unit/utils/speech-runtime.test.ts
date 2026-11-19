import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { speechLibraryDir, speechLibraryName } from '../../../utils/speech-runtime'

describe('speech library', () => {
  it('reads the libraries extracted next to the server binary', () => {
    const root = mkdtempSync(join(tmpdir(), 'pierre-speech-'))
    try {
      const dir = join(root, 'transcribe')
      mkdirSync(dir)
      writeFileSync(join(dir, speechLibraryName()), '')
      expect(speechLibraryDir(join(root, 'pierre'))).toBe(dir)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('uses the installed package when the binary has no sibling libraries', () => {
    const dir = speechLibraryDir(join(tmpdir(), 'missing', 'pierre'))
    if (!dir) throw new Error('Bibliothèque de transcription absente.')
    expect(existsSync(join(dir, speechLibraryName()))).toBe(true)
  })
})
