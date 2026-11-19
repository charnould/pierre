import { describe, expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { latestSpeechTag, SPEECH_MODEL_FILE, speechInstalled } from './speech-model.ts'

describe('speech model release', () => {
  it('keeps the highest speech tag and ignores the other products', () => {
    expect(
      latestSpeechTag([
        'carl-9.0.0',
        'speech-1.0.0',
        'SPEECH-9.9.9',
        'speech-1.2.0',
        'server-3.0.0'
      ])
    ).toBe('speech-1.2.0')
  })

  it('accepts a directory only when the stamp and the weights are both present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-speech-'))
    expect(speechInstalled(dir, 'speech-1.0.0')).toBe(false)
    writeFileSync(join(dir, 'version'), 'speech-1.0.0\n')
    expect(speechInstalled(dir, 'speech-1.0.0')).toBe(false)
    writeFileSync(join(dir, SPEECH_MODEL_FILE), 'weights')
    expect(speechInstalled(dir, 'speech-1.0.0')).toBe(true)
    expect(speechInstalled(dir, 'speech-1.0.1')).toBe(false)
  })
})
