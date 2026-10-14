import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { latestCarlTag } from '../../../../shared/carl-model'
import { carlInstalled } from '../../../utils/ensure-carl'

const FILES = ['model.onnx', 'labels.json', 'tokenizer.json', 'tokenizer_config.json'] as const

describe('carl installé', () => {
  it('keeps the highest carl release', () => {
    expect(latestCarlTag(['carl-1.2.0', 'carl-1.10.0', 'server-1.0.0', 'CARL-9.9.9'])).toBe(
      'carl-1.10.0'
    )
    expect(latestCarlTag(['note'])).toBe('')
  })

  it('requires the version and the four model files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-carl-'))
    try {
      expect(carlInstalled(dir, 'carl-1.0.0')).toBe(false)
      writeFileSync(join(dir, 'version'), 'carl-1.0.0\n')
      writeFileSync(join(dir, 'model.onnx'), 'model')
      expect(carlInstalled(dir, 'carl-1.0.0')).toBe(false)
      for (const name of FILES) writeFileSync(join(dir, name), name)
      expect(carlInstalled(dir, 'carl-1.0.0')).toBe(true)
      expect(carlInstalled(dir, 'carl-1.2.0')).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
