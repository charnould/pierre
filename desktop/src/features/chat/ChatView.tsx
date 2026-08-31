import { MessageSquare } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { DiscuterChat } from '@/features/chat/ChatPanel'
import { panelScreen } from '@/features/workflow/components/WorkflowPanelChrome'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import type { ChatBootData } from '@/shared/types'

interface PanelProps {
  hidden: boolean
  isLoggedIn: boolean
  agentName: string
  url?: string
}

export function ChatView({ hidden, isLoggedIn, agentName, url }: PanelProps) {
  const [bootSnapshot, setBootSnapshot] = useState<{
    url: string
    data: ChatBootData | null
  } | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !url || hidden || !window.api?.getChatBoot) return
    const capturedUrl = url
    void window.api.getChatBoot({ url: capturedUrl }).then((data) => {
      setBootSnapshot({ url: capturedUrl, data: data ?? null })
    })
  }, [hidden, isLoggedIn, url])

  const boot = bootSnapshot && bootSnapshot.url === url ? bootSnapshot.data : null
  const showPlaceholder = !isLoggedIn || !url || !boot
  const showBootLoading = Boolean(isLoggedIn && url && !hidden && bootSnapshot?.url !== url)

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
      ) : boot && url ? (
        <DiscuterChat
          url={url}
          boot={boot}
          agentName={agentName}
          onBootChange={(data) => setBootSnapshot({ url, data })}
        />
      ) : null}
    </motion.div>
  )
}
