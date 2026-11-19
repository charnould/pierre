import { afterEach, describe, expect, it } from 'bun:test'

import { encodePcmFrame } from '../../../utils/speech-protocol'
import {
  setSpeechWorkerForTests,
  SpeechBusyError,
  transcribeSpeech
} from '../../../utils/speech-session'

afterEach(() => setSpeechWorkerForTests(null))

describe('speech session', () => {
  it('sends one framed utterance and returns the worker text', async () => {
    const frames: Uint8Array[] = []
    setSpeechWorkerForTests(() => ({
      write: (frame) => frames.push(frame),
      readLine: async () => JSON.stringify({ ok: true, text: 'Bonjour.' }),
      kill: () => undefined
    }))
    await expect(transcribeSpeech(Uint8Array.of(1, 2))).resolves.toBe('Bonjour.')
    expect(frames).toHaveLength(1)
    expect(Array.from(frames[0] ?? [])).toEqual(Array.from(encodePcmFrame(Uint8Array.of(1, 2))))
  })

  it('rejects when eight dictations are already waiting', async () => {
    const pending: Array<(line: string) => void> = []
    setSpeechWorkerForTests(() => ({
      write: () => undefined,
      readLine: () =>
        new Promise((resolve) => {
          pending.push(resolve)
        }),
      kill: () => undefined
    }))
    const jobs = [transcribeSpeech(Uint8Array.of(1, 0))]
    for (let index = 0; index < 8; index += 1) jobs.push(transcribeSpeech(Uint8Array.of(1, 0)))
    await expect(transcribeSpeech(Uint8Array.of(1, 0))).rejects.toBeInstanceOf(SpeechBusyError)
    for (const job of jobs) {
      pending.shift()?.(JSON.stringify({ ok: true, text: 'ok' }))
      await expect(job).resolves.toBe('ok')
    }
  })
})
