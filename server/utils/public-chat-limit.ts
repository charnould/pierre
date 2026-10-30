const WINDOW_MS = 60_000
const DEFAULT_PER_WINDOW = 600
const DEFAULT_MAX_ACTIVE = 96

const hits = new Map<string, number>()
let windowStartedAt = 0
let active = 0

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(Bun.env[name] ?? fallback)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

export function publicChatAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const address = forwarded
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1)
  return address || 'local'
}

export function beginPublicChat(
  address: string,
  now = Date.now()
): { ok: true; release: () => void } | { ok: false; retryAfter: number } {
  if (windowStartedAt === 0 || now < windowStartedAt || now - windowStartedAt >= WINDOW_MS) {
    hits.clear()
    windowStartedAt = now
  }
  const count = hits.get(address) ?? 0
  if (count >= positiveInteger('PUBLIC_CHAT_PER_MINUTE', DEFAULT_PER_WINDOW)) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((windowStartedAt + WINDOW_MS - now) / 1000))
    }
  }
  if (active >= positiveInteger('SMOLVM_MAX_ACTIVE', DEFAULT_MAX_ACTIVE)) {
    return { ok: false, retryAfter: 1 }
  }
  hits.set(address, count + 1)
  active += 1
  let released = false
  return {
    ok: true,
    release() {
      if (released) return
      released = true
      active = Math.max(0, active - 1)
    }
  }
}

export function resetPublicChatLimit(): void {
  hits.clear()
  windowStartedAt = 0
  active = 0
}
