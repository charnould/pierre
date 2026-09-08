import type { AiStreamEvent } from '../../../../../shared/ai-stream-events'

export type ChatStreamRequest = {
  configId: string
  convId: string
  dataParam: string
  message: string
  files: File[]
}

export type ChatQuestionnaireRequest = {
  convId: string
  requestId: string
  responseSecret: string
  answers: Array<{ question: string; answer: string }>
}

export type ChatTransport = {
  stream: (
    request: ChatStreamRequest,
    onEvent: (event: AiStreamEvent) => void,
    signal: AbortSignal
  ) => Promise<void>
  submitQuestionnaire: (request: ChatQuestionnaireRequest) => Promise<boolean>
}
