import { ipcMain, session } from 'electron'

import type {
  AdminError,
  ConversationDetailResponse,
  ConversationListResponse,
  GetAdminConversationParams,
  GetLlmRunParams,
  GetLlmUsageParams,
  ListAdminConversationsParams,
  ListLlmRunsParams,
  LlmRunListResponse,
  LlmRunResponse,
  LlmUsageResponse,
  SaveAdminConversationReviewParams
} from '../../../src/shared/types/admin-insights'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

const root = (url: string) => url.replace(/\/$/, '')

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export function registerAdminHandlers(partition: string): void {
  const ses = () => session.fromPartition(partition)

  ipcMain.handle(
    IpcChannel.admin.conversations,
    async (_, params: ListAdminConversationsParams) => {
      try {
        const response = await netFetch(
          `${root(params.url)}/admin/conversations${query({
            q: params.q,
            reviewStatus: params.reviewStatus,
            audience: params.audience,
            chatbot: params.chatbot,
            offset: params.offset
          })}`,
          { session: ses() }
        )
        return (await response.json()) as ConversationListResponse | AdminError
      } catch (error) {
        logMainError('get-admin-conversations', error)
        return null
      }
    }
  )

  ipcMain.handle(IpcChannel.admin.conversation, async (_, params: GetAdminConversationParams) => {
    try {
      const response = await netFetch(
        `${root(params.url)}/admin/conversations/${encodeURIComponent(params.convId)}`,
        { session: ses() }
      )
      return (await response.json()) as ConversationDetailResponse | AdminError
    } catch (error) {
      logMainError('get-admin-conversation', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.admin.review, async (_, params: SaveAdminConversationReviewParams) => {
    const { url, convId, ...body } = params
    try {
      const response = await netFetch(
        `${root(url)}/admin/conversations/${encodeURIComponent(convId)}/review`,
        {
          session: ses(),
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      )
      return (await response.json()) as ConversationDetailResponse | AdminError
    } catch (error) {
      logMainError('put-admin-conversation-review', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.admin.llmUsage, async (_, params: GetLlmUsageParams) => {
    try {
      const response = await netFetch(
        `${root(params.url)}/admin/llm-usage${query({ period: params.period })}`,
        { session: ses() }
      )
      return (await response.json()) as LlmUsageResponse | AdminError
    } catch (error) {
      logMainError('get-admin-llm-usage', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.admin.llmRuns, async (_, params: ListLlmRunsParams) => {
    try {
      const response = await netFetch(
        `${root(params.url)}/admin/llm-runs${query({ period: params.period, offset: params.offset })}`,
        { session: ses() }
      )
      return (await response.json()) as LlmRunListResponse | AdminError
    } catch (error) {
      logMainError('get-admin-llm-runs', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.admin.llmRun, async (_, params: GetLlmRunParams) => {
    try {
      const response = await netFetch(
        `${root(params.url)}/admin/llm-runs/${encodeURIComponent(params.id)}`,
        { session: ses() }
      )
      return (await response.json()) as LlmRunResponse | AdminError
    } catch (error) {
      logMainError('get-admin-llm-run', error)
      return null
    }
  })
}
