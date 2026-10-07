import { describe, expect, it } from 'bun:test'

import { parseArgs } from './update'

describe('microvm update arguments', () => {
  it('accepts explicit partial pin updates', () => {
    expect(parseArgs(['--smolvm', '1.24.0', '--pi', '1.0.4'])).toEqual({
      rebuild: false,
      values: { smolvm: '1.24.0', pi: '1.0.4' }
    })
  })

  it('accepts an explicit guest rebuild', () => {
    expect(parseArgs(['--rebuild'])).toEqual({ rebuild: true, values: {} })
  })

  it('rejects implicit or malformed updates', () => {
    expect(() => parseArgs([])).toThrow('Provide explicit versions or --rebuild')
    expect(() => parseArgs(['--latest'])).toThrow('Unknown argument')
    expect(() => parseArgs(['--node'])).toThrow('Missing value')
  })
})
