import { describe, expect, test } from 'bun:test'

import {
  buildRegeneratePayload,
  findLastUserMessage,
  readAskUserAnswers,
  truncateAfterLastUserMessage
} from '@/features/chat/lib/chat-session-messages'
import type { Message } from '@/features/chat/lib/chat-session-types'

function userMessage(content: string): Message {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    parts: [{ type: 'text', contentIndex: 0, text: content }]
  }
}

function assistantMessage(text: string): Message {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    parts: [{ type: 'text', contentIndex: 0, text }]
  }
}

describe('chat session messages', () => {
  test('findLastUserMessage returns the latest user turn', () => {
    const messages: Message[] = [
      userMessage('first'),
      assistantMessage('reply'),
      userMessage('second')
    ]
    expect(findLastUserMessage(messages)?.parts).toEqual([
      { type: 'text', contentIndex: 0, text: 'second' }
    ])
  })

  test('truncateAfterLastUserMessage removes last user and assistant', () => {
    const messages: Message[] = [
      userMessage('first'),
      assistantMessage('reply'),
      userMessage('second'),
      { id: 'a2', role: 'assistant', parts: [] }
    ]
    expect(truncateAfterLastUserMessage(messages)).toHaveLength(2)
  })

  test('buildRegeneratePayload includes the latest user text', () => {
    const messages: Message[] = [userMessage('analyze'), assistantMessage('done')]
    const payload = buildRegeneratePayload(messages)
    expect(payload).toEqual({ text: 'analyze', attachments: [], files: [] })
  })

  test('buildRegeneratePayload reuses persisted attachments without file bytes', () => {
    const attachment = new File(['content'], 'rapport.pdf', { type: 'application/pdf' })
    const message = userMessage('')
    message.attachments = [{ name: attachment.name, type: attachment.type, size: attachment.size }]
    message.attachmentsPersisted = true

    expect(buildRegeneratePayload([message, assistantMessage('done')])).toEqual({
      text: '',
      attachments: [{ name: 'rapport.pdf', type: 'application/pdf', size: 7 }],
      files: []
    })
  })

  test('buildRegeneratePayload retains bytes for an upload that did not persist', () => {
    const attachment = new File(['content'], 'rapport.pdf', { type: 'application/pdf' })
    const message = userMessage('Analyse')
    message.attachments = [{ name: attachment.name, type: attachment.type, size: attachment.size }]
    message.attachmentFiles = [attachment]

    expect(buildRegeneratePayload([message])?.files).toEqual([attachment])
  })

  test('buildRegeneratePayload returns null without user message', () => {
    expect(buildRegeneratePayload([])).toBeNull()
  })

  test('reads completed ask_user answers from details or text transport', () => {
    const answers = [{ question: 'Continuer ?', answer: 'Oui' }]
    expect(readAskUserAnswers({ details: { answers } })).toEqual(answers)
    expect(
      readAskUserAnswers({
        content: [{ type: 'text', text: JSON.stringify(answers) }]
      })
    ).toEqual(answers)
    expect(readAskUserAnswers({ content: [{ type: 'text', text: 'not json' }] })).toBeNull()
  })
})
