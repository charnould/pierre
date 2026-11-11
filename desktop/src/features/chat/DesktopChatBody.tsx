import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChatPanel, type ChatPanelHandle } from '@/features/chat/ChatPanel'
import { ProfileSelector } from '@/features/chat/components/ProfileSelector'
import { createIpcChatTransport } from '@/features/chat/lib/ipc-chat-transport'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { Spinner } from '@/shared/components/ui/spinner'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import type { ChatBoot } from '@/shared/types'

interface Props {
  url?: string
  agentName: string
  /** Fetch and focus while true. Hiding keeps this surface’s thread and VM. */
  active: boolean
}

export function DesktopChatBody({ url, agentName, active }: Props) {
  const panelRef = useRef<ChatPanelHandle>(null)
  const requestRef = useRef<{ url: string; promise: Promise<ChatBoot | null> } | null>(null)
  const conversationRef = useRef<{ url: string; convId: string } | null>(null)
  const mountedRef = useRef(true)
  const [bootSnapshot, setBootSnapshot] = useState<{
    url: string
    data: ChatBoot | null
  } | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const conversation = conversationRef.current
      if (conversation) releaseConversationVm(conversation.url, conversation.convId)
    }
  }, [])

  useEffect(() => {
    if (
      !active ||
      !url ||
      !window.api?.getChatBoot ||
      bootSnapshot?.url === url ||
      requestRef.current?.url === url
    ) {
      return
    }
    const promise = window.api.getChatBoot({ url })
    requestRef.current = { url, promise }
    void promise.then((data) => {
      if (!mountedRef.current || requestRef.current?.promise !== promise) return
      requestRef.current = null
      setBootSnapshot({ url, data: data ?? null })
    })
  }, [active, bootSnapshot?.url, url])

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

  const handleProfileSelect = useCallback(
    async (newConfigId: string) => {
      if (!url || !boot || newConfigId === boot.configId) return
      panelRef.current?.stop()
      releaseConversationVm(url, boot.convId)
      const data = await window.api.getChatBoot({ url, config: newConfigId })
      if (!data) {
        panelRef.current?.resetAfterAbortedStop()
        return
      }
      panelRef.current?.clearMessages()
      setBootSnapshot({ url, data })
    },
    [boot, url]
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
