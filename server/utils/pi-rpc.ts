import type { FileSink } from 'bun'

export type PiRpcProcess = {
  stdin: FileSink
  stdout: ReadableStream<Uint8Array>
}

type PendingCommand = {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
}

/**
 * Manages the JSONL RPC protocol between Pierre (host) and Pi (inside smolVM).
 *
 * - Commands sent via `sendCommand` receive a response matched by `id`
 * - Events (streaming, tool calls, agent_end…) are dispatched to `onEvent` listeners
 * - `dispose()` stops all listeners and fails pending commands
 */
export class PiRpcClient {
  private readonly process: PiRpcProcess
  private readonly pendingCommands = new Map<string, PendingCommand>()
  private readonly eventListeners = new Set<(event: Record<string, unknown>) => void>()
  private readonly closeListeners = new Set<() => void>()
  private nextId = 0
  private closed = false
  private disposed = false

  constructor(process: PiRpcProcess) {
    this.process = process
    void this.startReader()
  }

  private async startReader(): Promise<void> {
    let buffer = ''
    const decoder = new TextDecoder()
    try {
      for await (const chunk of this.process.stdout) {
        if (this.disposed) break
        buffer += decoder.decode(chunk, { stream: true })
        // Pi docs: split on \n only (NOT \r\n, NOT Unicode line separators)
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const msg = JSON.parse(trimmed) as Record<string, unknown>
            const id = msg['id'] as string | undefined
            if (id !== undefined && this.pendingCommands.has(id)) {
              const pending = this.pendingCommands.get(id)!
              this.pendingCommands.delete(id)
              pending.resolve(msg)
            } else {
              for (const listener of this.eventListeners) listener(msg)
            }
          } catch {
            console.warn('[PI_RPC] Unparseable line:', trimmed.slice(0, 200))
          }
        }
      }
    } catch (err) {
      if (!this.disposed) console.warn('[PI_RPC] Reader error:', err)
    }

    this.closed = true
    for (const [, pending] of this.pendingCommands) {
      pending.reject(new Error('Pi process stdout closed'))
    }
    this.pendingCommands.clear()
    if (!this.disposed) {
      for (const listener of this.closeListeners) listener()
    }
  }

  /** Sends a command with a unique id and waits for the matching response. */
  async sendCommand<T = Record<string, unknown>>(
    cmd: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<T> {
    if (this.disposed) throw new Error('Pi RPC client disposed')
    if (this.closed) throw new Error('Pi process stdout closed')

    const id = `cmd-${++this.nextId}`
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const cleanup = () => {
        if (timer !== undefined) clearTimeout(timer)
        this.pendingCommands.delete(id)
      }
      this.pendingCommands.set(id, {
        resolve: (data) => {
          cleanup()
          resolve(data as T)
        },
        reject: (err) => {
          cleanup()
          reject(err)
        }
      })
      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          this.pendingCommands.delete(id)
          reject(new Error(`Pi command "${cmd['type']}" timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }
      try {
        this.write(JSON.stringify({ ...cmd, id }))
      } catch (err) {
        cleanup()
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  /** Sends a command without waiting for a response (fire-and-forget). */
  sendRaw(cmd: Record<string, unknown>): void {
    if (this.disposed || this.closed) return
    this.write(JSON.stringify(cmd))
  }

  /** Subscribes to Pi events (lines without a matching command id). Returns an unsubscribe fn. */
  onEvent(listener: (event: Record<string, unknown>) => void): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  /** Subscribes to unexpected subprocess/stdout closure. */
  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener)
    return () => {
      this.closeListeners.delete(listener)
    }
  }

  /**
   * Sends a single `get_session_stats` command and waits for Pi to answer once ready.
   * The kernel stdin pipe buffers the line until Pi reads stdin; stdout closure rejects immediately.
   */
  async waitForReady(timeoutMs = 30_000): Promise<void> {
    await this.sendCommand({ type: 'get_session_stats' }, timeoutMs)
  }

  /** Stops event dispatching and fails pending commands. */
  dispose(): void {
    this.disposed = true
    for (const [, pending] of this.pendingCommands) {
      pending.reject(new Error('Pi RPC client disposed'))
    }
    this.pendingCommands.clear()
    this.eventListeners.clear()
    this.closeListeners.clear()
  }

  private write(line: string): void {
    this.process.stdin.write(line + '\n')
    Promise.resolve(this.process.stdin.flush()).catch(() => {})
  }
}
