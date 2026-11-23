import { describe, expect, it } from 'bun:test'

import type { FileSink } from 'bun'

import { PiRpcClient, type PiRpcProcess } from '../../../utils/pi-rpc'

function createFakeProcess() {
  const written: string[] = []
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const encoder = new TextEncoder()

  const stdout = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl
    }
  })

  const stdin = {
    write(chunk: string) {
      written.push(chunk)
      return chunk.length
    },
    flush() {
      return 0
    }
  } as unknown as FileSink

  const process: PiRpcProcess = { stdin, stdout }

  return {
    process,
    written,
    emit(line: string) {
      controller.enqueue(encoder.encode(`${line}\n`))
    },
    closeStdout() {
      controller.close()
    }
  }
}

describe('PiRpcClient', () => {
  it('resolves waitForReady on the first response even when Pi responds after >500ms', async () => {
    const fake = createFakeProcess()
    const client = new PiRpcClient(fake.process)

    const ready = client.waitForReady(5_000)
    await Bun.sleep(600)

    // Must send a single get_session_stats request without destructive retry polling
    expect(fake.written).toHaveLength(1)
    const sent = JSON.parse(fake.written[0]!) as { id: string; type: string }
    expect(sent.type).toBe('get_session_stats')

    fake.emit(JSON.stringify({ id: sent.id, type: 'response', command: sent.type, success: true }))
    await expect(ready).resolves.toBeUndefined()
    client.dispose()
  })

  it('rejects waitForReady immediately when stdout closes before any response', async () => {
    const fake = createFakeProcess()
    const client = new PiRpcClient(fake.process)

    const startedAt = Date.now()
    const ready = client.waitForReady(30_000)
    await Bun.sleep(10)
    fake.closeStdout()

    await expect(ready).rejects.toThrow('Pi process stdout closed')
    expect(Date.now() - startedAt).toBeLessThan(1_000)
    client.dispose()
  })

  it('rejects pending commands and triggers onClose on unexpected stdout closure', async () => {
    const fake = createFakeProcess()
    const client = new PiRpcClient(fake.process)
    let closeCalls = 0
    client.onClose(() => {
      closeCalls += 1
    })

    const pending = client.sendCommand({ type: 'get_state' }, 10_000)
    fake.closeStdout()

    await expect(pending).rejects.toThrow('Pi process stdout closed')
    expect(closeCalls).toBe(1)
  })

  it('rejects pending commands on dispose without firing onClose', async () => {
    const fake = createFakeProcess()
    const client = new PiRpcClient(fake.process)
    let closeCalls = 0
    client.onClose(() => {
      closeCalls += 1
    })

    const pending = client.sendCommand({ type: 'get_state' }, 10_000)
    const settled = pending.then(
      () => null,
      (err: Error) => err
    )
    client.dispose()
    fake.closeStdout()
    await Bun.sleep(10)

    const error = await settled
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toBe('Pi RPC client disposed')
    expect(closeCalls).toBe(0)
  })
})
