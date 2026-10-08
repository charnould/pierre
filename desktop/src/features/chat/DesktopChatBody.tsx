import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { ChatPanel, type ChatPanelHandle } from '@/features/chat/ChatPanel'
import { ProfileSelector } from '@/features/chat/components/ProfileSelector'
import { createIpcChatTransport } from '@/features/chat/lib/ipc-chat-transport'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { Spinner } from '@/shared/components/ui/spinner'
import { moduleReady, subscribeCustomization } from '@/shared/lib/instance-customization'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { ChatBoot } from '@/shared/types'

export interface PendingChatPrompt {
  id: number
  text: string
  configId: string | null
}

interface Props {
  url?: string
  agentName: string
  /** Fetch and focus while true. Hiding keeps this surface’s thread and VM. */
  active: boolean
  chatbotIds?: readonly string[]
  configId?: string | null
  onConfigId?: (configId: string) => void
  pendingPrompt?: PendingChatPrompt | null
  onConsumePrompt?: (id: number) => void
}

export async function switchChatProfile(
  url: string,
  boot: ChatBoot,
  configId: string,
  panel: ChatPanelHandle | null
): Promise<ChatBoot | null> {
  if (configId === boot.configId) return boot
  panel?.stop()
  releaseConversationVm(url, boot.convId)
  try {
    const data = await window.api.getChatBoot({ url, config: configId })
    if (!data) {
      panel?.resetAfterAbortedStop()
      return null
    }
    panel?.clearMessages()
    return data
  } catch (error) {
    warnRenderer('DesktopChatBody.profile', error)
    panel?.resetAfterAbortedStop()
    return null
  }
}

export function DesktopChatBody({
  url,
  agentName,
  active,
  chatbotIds = [],
  configId = null,
  onConfigId,
  pendingPrompt,
  onConsumePrompt
}: Props) {
  const panelRef = useRef<ChatPanelHandle>(null)
  const consumedPromptIdRef = useRef<number | null>(null)
  const switchingRef = useRef<string | null>(null)
  const failedConfigRef = useRef<string | null>(null)
  const requestRef = useRef<{
    signature: string
    promise: Promise<ChatBoot | null>
  } | null>(null)
  const attemptedBoot = useRef<string | null>(null)
  const conversationRef = useRef<{ url: string; convId: string } | null>(null)
  const mountedRef = useRef(true)
  const [bootSnapshot, setBootSnapshot] = useState<{
    url: string
    signature: string
    data: ChatBoot | null
  } | null>(null)
  const chatbotReady = useSyncExternalStore(subscribeCustomization, () => moduleReady('chatbot'))
  const bootSignature = `${url ?? ''}\0${chatbotReady ? '1' : '0'}\0${chatbotIds.join(',')}`

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const conversation = conversationRef.current
      if (conversation) releaseConversationVm(conversation.url, conversation.convId)
    }
  }, [])

  useEffect(() => {
    if (!active) {
      attemptedBoot.current = null
      return
    }
    if (!url || !window.api?.getChatBoot) return
    if (
      bootSnapshot?.url === url &&
      bootSnapshot.signature === bootSignature &&
      bootSnapshot.data
    ) {
      return
    }
    if (
      attemptedBoot.current === bootSignature ||
      requestRef.current?.signature === bootSignature
    ) {
      return
    }
    attemptedBoot.current = bootSignature
    const promise = window.api.getChatBoot({ url })
    requestRef.current = { signature: bootSignature, promise }
    void promise.then(
      (data) => {
        if (!mountedRef.current || requestRef.current?.promise !== promise) return
        requestRef.current = null
        setBootSnapshot((current) => {
          const next = data ?? null
          if (!next) return current?.data ? current : { url, signature: bootSignature, data: null }
          if (current?.url === url && current.data?.configId === next.configId) {
            return {
              url,
              signature: bootSignature,
              data: { ...next, convId: current.data.convId }
            }
          }
          return { url, signature: bootSignature, data: next }
        })
      },
      (error) => {
        if (!mountedRef.current || requestRef.current?.promise !== promise) return
        requestRef.current = null
        warnRenderer('DesktopChatBody.boot', error)
        setBootSnapshot((current) =>
          current?.data ? current : { url, signature: bootSignature, data: null }
        )
      }
    )
  }, [active, bootSignature, bootSnapshot, url])

  const boot = bootSnapshot && bootSnapshot.url === url ? bootSnapshot.data : null

  useEffect(() => {
    if (boot && url) conversationRef.current = { url, convId: boot.convId }
  }, [boot, url])

  const transport = useMemo(() => (url ? createIpcChatTransport(url) : null), [url])
  const showPlaceholder = !url || !boot
  const showBootLoading = Boolean(url && active && bootSnapshot?.url !== url)

  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => panelRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [active, boot?.convId])

  useEffect(() => {
    if (boot) onConfigId?.(boot.configId)
  }, [boot, onConfigId])

  const requestedConfigId = pendingPrompt?.configId || configId || null

  useEffect(() => {
    if (!active || !boot || !url || !requestedConfigId || requestedConfigId === boot.configId) {
      return
    }
    if (
      failedConfigRef.current === requestedConfigId ||
      switchingRef.current === requestedConfigId
    ) {
      return
    }
    switchingRef.current = requestedConfigId
    const promptId = pendingPrompt?.configId === requestedConfigId ? pendingPrompt.id : null
    void switchChatProfile(url, boot, requestedConfigId, panelRef.current).then((data) => {
      if (switchingRef.current === requestedConfigId) switchingRef.current = null
      if (!mountedRef.current) return
      if (!data || data.configId !== requestedConfigId) {
        failedConfigRef.current = requestedConfigId
        if (promptId !== null && consumedPromptIdRef.current !== promptId) {
          consumedPromptIdRef.current = promptId
          onConsumePrompt?.(promptId)
        }
        return
      }
      failedConfigRef.current = null
      setBootSnapshot({ url, signature: bootSignature, data })
    })
  }, [active, boot, bootSignature, onConsumePrompt, pendingPrompt, requestedConfigId, url])

  useEffect(() => {
    if (!active || !boot || !transport || !pendingPrompt) return
    if (consumedPromptIdRef.current === pendingPrompt.id) return
    if (!panelRef.current) return
    if (pendingPrompt.configId && pendingPrompt.configId !== boot.configId) return
    consumedPromptIdRef.current = pendingPrompt.id
    panelRef.current.sendPrompt(pendingPrompt.text)
    onConsumePrompt?.(pendingPrompt.id)
  }, [active, boot, onConsumePrompt, pendingPrompt, transport])

  const handleProfileSelect = useCallback(
    async (newConfigId: string) => {
      if (!url || !boot) return
      const data = await switchChatProfile(url, boot, newConfigId, panelRef.current)
      if (!mountedRef.current || !data || data === boot) return
      setBootSnapshot({ url, signature: bootSignature, data })
    },
    [boot, bootSignature, url]
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ModuleGate entry="chatbot">
        <div
          data-chat-chrome="desktop"
          className="bg-background relative flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {showPlaceholder ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
              <div className="flex max-w-sm flex-col items-center gap-2" role="status">
                {showBootLoading ? <Spinner aria-hidden role="presentation" /> : null}
                <p className="text-muted-foreground text-center text-balance">
                  {!url
                    ? 'Configurez et connectez-vous pour accéder au chatbot.'
                    : showBootLoading
                      ? 'Chargement du chatbot…'
                      : 'Impossible de charger le chatbot.'}
                </p>
              </div>
            </div>
          ) : boot && transport ? (
            <ChatPanel
              ref={panelRef}
              boot={boot}
              composerAppearance="form"
              minimal
              transport={transport}
              composerAccessory={
                <ProfileSelector
                  configs={boot.displayableConfigs}
                  activeId={boot.configId}
                  agentName={agentName}
                  onSelect={handleProfileSelect}
                />
              }
            />
          ) : null}
        </div>
      </ModuleGate>
    </div>
  )
}
