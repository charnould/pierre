import type { Context } from 'hono'

import type { AuthContext } from '../utils/authenticate-user'
import { speechReady, speechVersion } from '../utils/speech-runtime'
import { SpeechBusyError, transcribeSpeech } from '../utils/speech-session'

/** 300 ms of 16 kHz mono signed 16-bit PCM. */
const SHORTEST = 9_600

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

export const postSpeech = async (c: AuthContext) => {
  const pcm = new Uint8Array(await c.req.arrayBuffer())
  const problem = speechAudioProblem(pcm.byteLength)
  if (problem) return c.json({ error: { code: 'invalid', message: problem } }, 400)
  if (!speechReady()) {
    return c.json(
      { error: { code: 'missing', message: "La dictée vocale n'est pas installée." } },
      503
    )
  }
  const started = performance.now()
  try {
    const text = await transcribeSpeech(pcm)
    return c.json({ data: { text, milliseconds: Math.round(performance.now() - started) } })
  } catch (error) {
    if (error instanceof SpeechBusyError) {
      return c.json({ error: { code: 'busy', message: error.message } }, 503)
    }
    console.error('Speech:', error)
    return c.json({ error: { code: 'failed', message: 'La transcription a échoué.' } }, 500)
  }
}
