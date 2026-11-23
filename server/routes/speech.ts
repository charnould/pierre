import type { Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import type { AuthContext } from '../utils/authenticate-user'
import { speechReady, speechVersion } from '../utils/speech-runtime'
import { SpeechBusyError, transcribeSpeech } from '../utils/speech-session'

/** 300 ms of 16 kHz mono signed 16-bit PCM. */
const SHORTEST = 9_600

export const speechBodyLimit = bodyLimit({
  maxSize: 4 * 1024 * 1024,
  onError: (c) =>
    c.json({ error: { code: 'body_too_large', message: 'La dictée est trop longue.' } }, 413)
})

function speechAudioProblem(byteLength: number): string | null {
  if (byteLength === 0 || byteLength % 2 !== 0) return 'Audio invalide.'
  if (byteLength < SHORTEST) return 'Dictée trop courte.'
  return null
}

export const getSpeech = (c: Context) => {
  if (!speechReady()) {
    return c.json(
      { error: { code: 'missing', message: "La dictée vocale n'est pas installée." } },
      503
    )
  }
  return c.json({ data: { version: speechVersion() } })
}

export async function transcribeSpeechRequest(
  c: Context,
  options: { includeMilliseconds?: boolean } = {}
) {
  if (!speechReady()) {
    return c.json(
      { error: { code: 'missing', message: "La dictée vocale n'est pas installée." } },
      503
    )
  }
  const pcm = new Uint8Array(await c.req.arrayBuffer())
  const problem = speechAudioProblem(pcm.byteLength)
  if (problem) return c.json({ error: { code: 'invalid', message: problem } }, 400)

  const started = performance.now()
  try {
    const text = await transcribeSpeech(pcm)
    return c.json({
      data: options.includeMilliseconds
        ? { text, milliseconds: Math.round(performance.now() - started) }
        : { text }
    })
  } catch (error) {
    if (error instanceof SpeechBusyError) {
      return c.json({ error: { code: 'busy', message: error.message } }, 503)
    }
    console.error('Speech:', error)
    return c.json({ error: { code: 'failed', message: 'La transcription a échoué.' } }, 500)
  }
}

export const postSpeech = (c: AuthContext) =>
  transcribeSpeechRequest(c, { includeMilliseconds: true })
