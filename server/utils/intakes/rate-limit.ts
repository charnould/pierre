const WINDOW_MS = 60_000
const SUBMIT_LIMIT_PER_MINUTE = 30
const SPEECH_LIMIT_PER_MINUTE = 30
const PASSWORD_FAIL_WINDOW_MS = 10 * 60_000
const PASSWORD_FAIL_LIMIT = 10
const SWEEP_THRESHOLD = 512

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number }

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs
  let first = 0
  while (first < timestamps.length && timestamps[first]! <= cutoff) first += 1
  return first > 0 ? timestamps.slice(first) : timestamps
}

function createSlidingWindow(limit: number, windowMs: number) {
  const store = new Map<string, number[]>()

  const sweepIfLarge = (now: number) => {
    if (store.size < SWEEP_THRESHOLD) return
    for (const [key, timestamps] of store) {
      const recent = prune(timestamps, windowMs, now)
      if (recent.length === 0) store.delete(key)
      else if (recent.length !== timestamps.length) store.set(key, recent)
    }
  }

  const check = (key: string, now: number): RateLimitResult => {
    const recent = prune(store.get(key) ?? [], windowMs, now)
    if (recent.length === 0) {
      store.delete(key)
      return { ok: true }
    }
    store.set(key, recent)
    if (recent.length >= limit) {
      const oldest = recent[0] ?? now
      return { ok: false, retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) }
    }
    return { ok: true }
  }

  const record = (key: string, now: number): void => {
    sweepIfLarge(now)
    const recent = prune(store.get(key) ?? [], windowMs, now)
    recent.push(now)
    store.set(key, recent)
  }

  const consume = (key: string, now: number): RateLimitResult => {
    const status = check(key, now)
    if (!status.ok) return status
    record(key, now)
    return { ok: true }
  }

  const reset = () => {
    store.clear()
  }

  return { check, record, consume, reset }
}

const submitLimiter = createSlidingWindow(SUBMIT_LIMIT_PER_MINUTE, WINDOW_MS)
const speechLimiter = createSlidingWindow(SPEECH_LIMIT_PER_MINUTE, WINDOW_MS)
const passwordFailureLimiter = createSlidingWindow(PASSWORD_FAIL_LIMIT, PASSWORD_FAIL_WINDOW_MS)

export function checkIntakeSubmitLimit(address: string, now = Date.now()): RateLimitResult {
  return submitLimiter.consume(address, now)
}

export function checkIntakeSpeechLimit(address: string, now = Date.now()): RateLimitResult {
  return speechLimiter.consume(address, now)
}

export function checkIntakePasswordLimit(
  address: string,
  token: string,
  now = Date.now()
): RateLimitResult {
  return passwordFailureLimiter.check(`${address}:${token}`, now)
}

export function recordIntakePasswordFailure(
  address: string,
  token: string,
  now = Date.now()
): void {
  passwordFailureLimiter.record(`${address}:${token}`, now)
}

export function resetIntakeRateLimits(): void {
  submitLimiter.reset()
  speechLimiter.reset()
  passwordFailureLimiter.reset()
}
