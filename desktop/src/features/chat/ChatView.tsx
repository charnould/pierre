import { MessageSquare } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { ChatPanel, type ChatPanelHandle } from '@/features/chat/ChatPanel'
import { ProfileSelector } from '@/features/chat/components/ProfileSelector'
import { createIpcChatTransport } from '@/features/chat/lib/ipc-chat-transport'
import { panelScreen } from '@/features/workflow/components/WorkflowPanelChrome'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import type { ChatBoot } from '@/shared/types'

interface PanelProps {
  hidden: boolean
  isLoggedIn: boolean
  agentName: string
  url?: string
}

export function ChatView({ hidden, isLoggedIn, agentName, url }: PanelProps) {
  const panelRef = useRef<ChatPanelHandle>(null)
  const [bootSnapshot, setBootSnapshot] = useState<{
    url: string
    data: ChatBoot | null
  } | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !url || hidden || !window.api?.getChatBoot) return
    const capturedUrl = url
    void window.api.getChatBoot({ url: capturedUrl }).then((data) => {
      setBootSnapshot({ url: capturedUrl, data: data ?? null })
    })
  }, [hidden, isLoggedIn, url])

  const boot = bootSnapshot && bootSnapshot.url === url ? bootSnapshot.data : null
  const transport = useMemo(() => (url ? createIpcChatTransport(url) : null), [url])
  const showPlaceholder = !isLoggedIn || !url || !boot
  const showBootLoading = Boolean(isLoggedIn && url && !hidden && bootSnapshot?.url !== url)

  useRegisterNavigationHandlers('chat', {
    beforeLeave: async () => {
      if (!url || !boot) return
      panelRef.current?.stop()
      releaseConversationVm(url, boot.convId)
    }
  })

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
    <motion.div
      data-tab-panel
      className="bg-background absolute inset-0 flex min-h-0 flex-col overflow-hidden"
      initial={false}
      animate={hidden ? 'hidden' : 'visible'}
      variants={panelScreen}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: hidden ? 0 : 2
      }}
    >
      {showPlaceholder ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Empty className="max-w-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {showBootLoading ? <Spinner /> : <MessageSquare strokeWidth={1.5} />}
              </EmptyMedia>
              <EmptyTitle>Discuter avec Pierre</EmptyTitle>
              <EmptyDescription>
                {!isLoggedIn || !url
                  ? 'Configurez et connectez-vous pour accéder au chatbot.'
                  : showBootLoading
                    ? 'Chargement du chatbot…'
                    : 'Impossible de charger le chatbot.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : boot && url && transport ? (
        <ChatPanel
          ref={panelRef}
          boot={boot}
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
    </motion.div>
  )
}
