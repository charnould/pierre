import { beforeEach, describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { createPostAiController } from '../../../../controllers/ai/post'
import {
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  MAX_MULTIPART_REQUEST_BYTES
} from '../../../../utils/ai-attachments'
import { conversationReservationCount } from '../../../../utils/vm-registry'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'

let capturedContext: unknown
let capturedFiles: File[] = []
let capturedKnowledgePath = ''
let capturedAttachments: unknown
let attachmentFailure: Error | undefined
let reservationObservedDuringStaging = 0
const attachmentLifecycle = { claim() {}, async rollback() {} }

const controller = createPostAiController({
  uploadsPath: (configName) => `/uploads/${configName}`,
  loadConfig: async (configName) => ({ id: configName, protected: false }),
  parseContext: async (value) => value as never,
  processAttachments: async (files, knowledgePath, message, convId) => {
    capturedFiles = files
    capturedKnowledgePath = knowledgePath
    reservationObservedDuringStaging = conversationReservationCount(convId!)
    if (attachmentFailure) throw attachmentFailure
    return {
      content: `${message}|${convId ?? 'none'}|processed`,
      images: [{ type: 'image', data: 'encoded', mimeType: 'image/png' as const }],
      uploadId: convId ?? null,
      ...attachmentLifecycle
    }
  },
  streamRequest: async (c, context, attachments, lifecycle) => {
    capturedContext = context
    capturedAttachments = attachments
    lifecycle?.claim()
    return c.body(
      `${JSON.stringify({ type: 'text_delta', delta: 'Bonjour' })}\n${JSON.stringify({ type: 'stream_end' })}\n`,
      200,
      { 'Content-Type': 'application/x-ndjson; charset=utf-8' }
    )
  },
  streamError: (c) =>
    c.body(`${JSON.stringify({ type: 'error' })}\n`, 200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8'
    })
})

const app = new Hono()
app.use('*', async (c, next) => {
  c.set('user' as never, { email: 'alice@example.org', config: ['testing_purpose_1'] } as never)
  await next()
})
app.post('/ai', controller)

beforeEach(() => {
  capturedContext = undefined
  capturedFiles = []
  capturedKnowledgePath = ''
  capturedAttachments = undefined
  attachmentFailure = undefined
  reservationObservedDuringStaging = 0
})

describe('POST /ai multipart and stream boundary', () => {
  it('processes multipart fields/files and returns the canonical NDJSON stream', async () => {
    const form = new FormData()
    form.set('config', 'testing_purpose_1')
    form.set('message', 'Question')
    form.set('conv_id', CONV_ID)
    form.set('data', 'tenant-1|ticket-2')
    form.append('files', new File(['image'], 'photo.png', { type: 'image/png' }))

    const response = await app.request('/ai', { method: 'POST', body: form })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/x-ndjson')
    expect(
      (await response.text())
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
    ).toEqual([{ type: 'text_delta', delta: 'Bonjour' }, { type: 'stream_end' }])
    expect(capturedFiles.map((file) => file.name)).toEqual(['photo.png'])
    expect(capturedKnowledgePath).toBe('/uploads/testing_purpose_1')
    expect(capturedContext).toMatchObject({
      custom_data: { raw: ['tenant-1', 'ticket-2'] },
      metadata: { user: 'alice@example.org' },
      content: `Question|${CONV_ID}|processed`,
      conv_id: CONV_ID,
      role: 'user'
    })
    expect(capturedAttachments).toEqual([{ type: 'image', data: 'encoded', mimeType: 'image/png' }])
    expect(reservationObservedDuringStaging).toBe(1)
    expect(conversationReservationCount(CONV_ID)).toBe(0)
  })

  it('normalizes absent custom data and emits a stream error when preprocessing fails', async () => {
    const form = new FormData()
    form.set('config', 'testing_purpose_1')
    form.set('message', 'Question')
    form.set('conv_id', '0198f1a0-7b6c-7000-8000-000000000002')
    attachmentFailure = new Error('unsupported attachment')

    const response = await app.request('/ai', { method: 'POST', body: form })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/x-ndjson')
    expect(await response.text()).toBe('{"type":"error"}\n')
    expect(capturedContext).toBeUndefined()
  })

  it('rolls back newly staged files when context validation fails before streaming', async () => {
    let rollbacks = 0
    const failingApp = new Hono()
    failingApp.post(
      '/ai',
      createPostAiController({
        uploadsPath: () => '/uploads/public',
        loadConfig: async (id) => ({ id, protected: false }),
        processAttachments: async () => ({
          content: 'processed',
          images: [],
          uploadId: CONV_ID,
          claim() {},
          async rollback() {
            rollbacks++
          }
        }),
        parseContext: async () => {
          throw new Error('invalid context')
        },
        streamError: (c) => c.body('{"type":"error"}\n')
      })
    )
    const form = new FormData()
    form.set('config', 'public_bot')
    form.set('conv_id', CONV_ID)
    form.append('files', new File(['x'], 'note.txt', { type: 'text/plain' }))

    const response = await failingApp.request('/ai', { method: 'POST', body: form })

    expect(response.status).toBe(200)
    expect(rollbacks).toBe(1)
    expect(conversationReservationCount(CONV_ID)).toBe(0)
  })

  it('rejects an anonymous request for the protected form config before attachment processing', async () => {
    let processed = false
    const anonymousApp = new Hono()
    anonymousApp.post(
      '/ai',
      createPostAiController({
        uploadsPath: () => '/uploads/protected',
        loadConfig: async (id) => ({ id, protected: true }),
        processAttachments: async () => {
          processed = true
          return { content: '', images: [], uploadId: null, ...attachmentLifecycle }
        }
      })
    )
    const form = new FormData()
    form.set('config', 'protected_bot')
    form.set('conv_id', CONV_ID)

    const response = await anonymousApp.request('/ai', { method: 'POST', body: form })

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: { code: 'forbidden', message: 'Chatbot configuration access denied' }
    })
    expect(processed).toBe(false)
  })

  it('accepts an anonymous request for the public form config', async () => {
    let processed = false
    const anonymousApp = new Hono()
    anonymousApp.post(
      '/ai',
      createPostAiController({
        uploadsPath: () => '/uploads/public',
        loadConfig: async (id) => ({ id, protected: false }),
        parseContext: async (value) => value as never,
        processAttachments: async (_files, _path, message) => {
          processed = true
          return { content: message, images: [], uploadId: CONV_ID, ...attachmentLifecycle }
        },
        streamRequest: async (c, _context, _attachments, lifecycle) => {
          lifecycle?.claim()
          return c.json({ ok: true })
        }
      })
    )
    const form = new FormData()
    form.set('config', 'public_bot')
    form.set('message', 'Bonjour')
    form.set('conv_id', CONV_ID)

    const response = await anonymousApp.request('/ai', { method: 'POST', body: form })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(processed).toBe(true)
  })

  it('rejects too many files with the structured multipart error', async () => {
    const form = new FormData()
    form.set('config', 'testing_purpose_1')
    form.set('conv_id', CONV_ID)
    for (let i = 0; i <= MAX_ATTACHMENT_FILES; i++) {
      form.append('files', new File(['x'], `${i}.txt`, { type: 'text/plain' }))
    }

    const response = await app.request('/ai', { method: 'POST', body: form })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: {
        code: 'too_many_files',
        message: `At most ${MAX_ATTACHMENT_FILES} files are allowed`
      }
    })
  })

  it('rejects an oversized declared request before parsing multipart', async () => {
    const response = await app.request('/ai', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=x',
        'content-length': String(MAX_MULTIPART_REQUEST_BYTES + 1)
      },
      body: '--x--\r\n'
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: { code: 'attachments_too_large', message: 'Multipart request is too large' }
    })
  })

  it('exports the exact multipart byte policy', () => {
    expect({
      request: MAX_MULTIPART_REQUEST_BYTES,
      perFile: MAX_ATTACHMENT_FILE_BYTES,
      aggregate: MAX_ATTACHMENT_TOTAL_BYTES
    }).toEqual({
      request: 22 * 1024 * 1024,
      perFile: 10 * 1024 * 1024,
      aggregate: 20 * 1024 * 1024
    })
  })
})
