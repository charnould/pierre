import { afterEach, describe, expect, mock, test } from 'bun:test'

import { createIpcChatTransport } from './ipc-chat-transport'

const startStream = mock(async () => true)
const postAiUiResponse = mock(async () => true)
const cancelStream = mock(async () => {})
const onAiChunk = mock((_requestId: string, _cb: (chunk: string) => void) => () => {})

function stubWindowApi() {
  Object.assign(globalThis, {
    window: {
      api: { startStream, postAiUiResponse, cancelStream, onAiChunk }
    }
  })
}

afterEach(() => {
  startStream.mockClear()
  postAiUiResponse.mockClear()
  cancelStream.mockClear()
  onAiChunk.mockClear()
  Reflect.deleteProperty(globalThis, 'window')
})

describe('createIpcChatTransport', () => {
  test('starts an IPC stream and forwards questionnaire answers', async () => {
    stubWindowApi()
    onAiChunk.mockImplementation((_requestId, cb) => {
      cb('{"type":"stream_end"}\n')
      return () => {}
    })

    const events: string[] = []
    await createIpcChatTransport('https://pierre.test').stream(
      {
        configId: 'default',
        convId: '00000000-0000-4000-8000-000000000001',
        dataParam: '',
        message: 'bonjour',
        files: []
      },
      (event) => {
        events.push(event.type)
      },
      new AbortController().signal
    )

    expect(startStream).toHaveBeenCalled()
    expect(startStream.mock.calls.at(0)?.at(0)).toMatchObject({
      url: 'https://pierre.test',
      config: 'default',
      message: 'bonjour',
      files: []
    })
    expect(events).toEqual(['stream_end'])

    expect(
      await createIpcChatTransport('https://pierre.test').submitQuestionnaire({
        convId: 'conv',
        requestId: 'req',
        responseSecret: 'secret',
        answers: [{ question: 'Q', answer: 'A' }]
      })
    ).toBe(true)
    expect(postAiUiResponse).toHaveBeenCalledWith({
      url: 'https://pierre.test',
      conv_id: 'conv',
      request_id: 'req',
      response_secret: 'secret',
      answers: [{ question: 'Q', answer: 'A' }]
    })
  })

  test('cancels the IPC stream when aborted', async () => {
    stubWindowApi()
    startStream.mockImplementation(async () => {
      await Bun.sleep(50)
      return true
    })

    const abort = new AbortController()
    const pending = createIpcChatTransport('https://pierre.test').stream(
      {
        configId: 'default',
        convId: '00000000-0000-4000-8000-000000000001',
        dataParam: '',
        message: 'bonjour',
        files: []
      },
      () => {},
      abort.signal
    )
    abort.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelStream).toHaveBeenCalled()
  })
})
