import { dlopen, FFIType, ptr } from 'bun:ffi'
import { join } from 'node:path'

import { SPEECH_MODEL_FILE } from '../../shared/speech-model'
import { SPEECH_DIR } from './paths'
import { pcm16ToFloat32, takePcmFrame } from './speech-protocol'
import { speechLibraryDir, speechLibraryName } from './speech-runtime'

const THREADS = Math.min(6, navigator.hardwareConcurrency || 1)

function fail(message: string): never {
  console.log(JSON.stringify({ ok: false, error: message }))
  process.exit(1)
}

function openLibrary() {
  const dir = speechLibraryDir()
  if (!dir) fail('Bibliothèque de transcription absente.')
  const library = dlopen(join(dir, speechLibraryName()), {
    transcribe_init_backends: { args: [FFIType.cstring], returns: FFIType.i32 },
    transcribe_session_params_init: { args: [FFIType.ptr], returns: FFIType.void },
    transcribe_open: {
      args: [FFIType.cstring, FFIType.ptr, FFIType.ptr, FFIType.ptr],
      returns: FFIType.i32
    },
    transcribe_run: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.i32, FFIType.ptr],
      returns: FFIType.i32
    },
    transcribe_full_text: { args: [FFIType.ptr], returns: FFIType.cstring },
    transcribe_close: { args: [FFIType.ptr], returns: FFIType.void }
  })
  if (library.symbols.transcribe_init_backends(dir) !== 0) {
    fail('Le moteur de transcription ne démarre pas.')
  }
  const params = new Uint8Array(64)
  library.symbols.transcribe_session_params_init(ptr(params))
  new DataView(params.buffer).setInt32(8, THREADS, true)
  const slot = new BigUint64Array(1)
  const opened = library.symbols.transcribe_open(
    join(SPEECH_DIR, SPEECH_MODEL_FILE),
    null,
    ptr(params),
    ptr(slot)
  )
  const session = slot[0]
  if (opened !== 0 || session === undefined || session === 0n) {
    fail(`Le modèle de dictée ne se charge pas (${opened}).`)
  }
  return { library, session }
}

function transcribe(
  session: bigint,
  pcm: Uint8Array,
  run: ReturnType<typeof openLibrary>['library']
) {
  const samples = pcm16ToFloat32(pcm)
  if (samples.length === 0) return ''
  const status = run.symbols.transcribe_run(session, ptr(samples), samples.length, null)
  if (status !== 0) throw new Error(`Transcription refusée (${status}).`)
  return run.symbols.transcribe_full_text(session) ?? ''
}

export async function runSpeechWorker(): Promise<void> {
  const { library, session } = openLibrary()
  let pending = new Uint8Array(0)
  const reader = Bun.stdin.stream().getReader()
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.value) {
        const next = new Uint8Array(pending.byteLength + chunk.value.byteLength)
        next.set(pending)
        next.set(chunk.value, pending.byteLength)
        pending = next
      }
      while (true) {
        const taken = takePcmFrame(pending)
        if (!taken) break
        pending = Uint8Array.from(taken.rest)
        try {
          const text = transcribe(session, Uint8Array.from(taken.pcm), library)
          console.log(JSON.stringify({ ok: true, text }))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'La transcription a échoué.'
          console.log(JSON.stringify({ ok: false, error: message }))
        }
      }
      if (chunk.done) break
    }
  } finally {
    library.symbols.transcribe_close(session)
  }
}
