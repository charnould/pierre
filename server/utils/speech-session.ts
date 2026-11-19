import { encodePcmFrame } from './speech-protocol'

const IDLE_MS = 5 * 60 * 1000
const TIMEOUT_MS = 15_000
const MAX_WAITING = 8

type Job = {
  pcm: Uint8Array
  resolve: (text: string) => void
  reject: (error: Error) => void
}

export class SpeechBusyError extends Error {
  constructor() {
    super('Trop de dictées en attente.')
  }
}

class SpeechFailedError extends Error {}

type Worker = {
  write: (frame: Uint8Array) => void
  readLine: () => Promise<string>
  kill: () => void
}

let spawnWorker: () => Worker = spawnProcess
let queue: Job[] = []
let active = false
let worker: Worker | null = null
let idle: ReturnType<typeof setTimeout> | null = null

export function setSpeechWorkerForTests(next: (() => Worker) | null): void {
  spawnWorker = next ?? spawnProcess
  stopWorker()
  queue = []
  active = false
}

function stopWorker(): void {
  if (idle) clearTimeout(idle)
  idle = null
  worker?.kill()
  worker = null
}

function armIdle(): void {
  if (idle) clearTimeout(idle)
  idle = setTimeout(() => stopWorker(), IDLE_MS)
  idle.unref?.()
}

function workerCommand(): string[] {
  const entry = process.argv[1]
  if (entry && !entry.endsWith('pierre')) return [process.execPath, entry, 'speech-worker']
  return [process.execPath, 'speech-worker']
}

function spawnProcess(): Worker {
  const proc = Bun.spawn(workerCommand(), { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' })
  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  const lines: string[] = []
  let waiter: ((line: string) => void) | null = null
  const pushLine = (line: string) => {
    if (!waiter) {
      lines.push(line)
      return
    }
    const resolve = waiter
    waiter = null
    resolve(line)
  }
  const pull = async () => {
    while (true) {
      const chunk = await reader.read()
      if (chunk.value) pending += decoder.decode(chunk.value, { stream: true })
      let newline = pending.indexOf('\n')
      while (newline >= 0) {
        pushLine(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        newline = pending.indexOf('\n')
      }
      if (chunk.done) {
        if (pending) pushLine(pending)
        return
      }
    }
  }
  void pull()
  return {
    write: (frame) => proc.stdin.write(frame),
    readLine: () => {
      const queued = lines.shift()
      if (queued !== undefined) return Promise.resolve(queued)
      return new Promise((resolve) => {
        waiter = resolve
      })
    },
    kill: () => proc.kill()
  }
}

async function runJob(pcm: Uint8Array): Promise<string> {
  worker ??= spawnWorker()
  worker.write(encodePcmFrame(pcm))
  const line = await Promise.race([
    worker.readLine(),
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new SpeechFailedError('La transcription a expiré.')), TIMEOUT_MS)
    })
  ]).catch((error: unknown) => {
    stopWorker()
    throw error
  })
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    stopWorker()
    throw new SpeechFailedError('Réponse de transcription illisible.')
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('ok' in parsed) ||
    parsed.ok !== true ||
    !('text' in parsed) ||
    typeof parsed.text !== 'string'
  ) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
        ? parsed.error
        : 'La transcription a échoué.'
    throw new SpeechFailedError(message)
  }
  return parsed.text
}

async function pump(): Promise<void> {
  if (active) return
  const job = queue.shift()
  if (!job) {
    armIdle()
    return
  }
  if (idle) clearTimeout(idle)
  idle = null
  active = true
  try {
    job.resolve(await runJob(job.pcm))
  } catch (error) {
    job.reject(error instanceof Error ? error : new SpeechFailedError('La transcription a échoué.'))
  } finally {
    active = false
    void pump()
  }
}

export function transcribeSpeech(pcm: Uint8Array): Promise<string> {
  if (queue.length >= MAX_WAITING) return Promise.reject(new SpeechBusyError())
  return new Promise((resolve, reject) => {
    queue.push({ pcm, resolve, reject })
    void pump()
  })
}
