import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from '@/components/ai/conversation'
import {
  PANEL_BG_CLASS,
  PANEL_CONTENT_MAX_W,
  panelContentStagger,
  panelScreen,
  panelScreenChild
} from '@/components/workflow/WorkflowPanelChrome'

import { usePierreChat } from '../../hooks/usePierreChat'
import { cancelAiStream } from '../../lib/run-ai-stream'
import type { ChatBootData } from '../../types'
import { ChatComposer } from '../chat/ChatComposer'
import { ChatMessages } from '../chat/ChatMessages'

interface PanelProps {
  hidden: boolean
  isLoggedIn: boolean
  url?: string
}

interface ChatProps {
  hidden: boolean
  url: string
  boot: ChatBootData
  onBootChange: (boot: ChatBootData) => void
}

function DiscuterChat({ hidden, url, boot, onBootChange }: ChatProps) {
  const chatConfig = useMemo(
    () => ({
      url,
      convId: boot.convId,
      configId: boot.configId,
      dataParam: boot.dataParam
    }),
    [url, boot.convId, boot.configId, boot.dataParam]
  )

  const { messages, status, sendMessage, stop, regenerate, clearMessages } =
    usePierreChat(chatConfig)
  const handleProfileSelect = useCallback(
    async (newConfigId: string) => {
      if (newConfigId === boot.configId) return
      cancelAiStream()
      clearMessages()
      const data = await window.api.getChatBoot({ url, config: newConfigId })
      if (data) onBootChange(data)
    },
    [boot.configId, clearMessages, onBootChange, url]
  )

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col items-center px-4 pt-2 pb-4"
      variants={panelContentStagger}
      initial={false}
      animate={hidden ? 'hidden' : 'visible'}
    >
      <motion.div
        className={`flex min-h-0 w-full ${PANEL_CONTENT_MAX_W} flex-1 flex-col overflow-hidden`}
        variants={panelScreenChild}
      >
        <Conversation className="h-full min-h-0">
          <ConversationContent className="gap-8 px-4 pt-4 pb-10">
            <ChatMessages
              messages={messages}
              status={status}
              boot={boot}
              onRegenerate={regenerate}
              onSend={sendMessage}
            />
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </motion.div>

      <motion.div className={`w-full ${PANEL_CONTENT_MAX_W} shrink-0`} variants={panelScreenChild}>
        <ChatComposer
          boot={boot}
          status={status}
          onSend={sendMessage}
          onStop={stop}
          onProfileSelect={handleProfileSelect}
        />
        {boot.disclaimer ? (
          <footer className="mt-2 px-1 text-center">
            <p className="text-muted-foreground text-[11px] leading-snug">{boot.disclaimer}</p>
          </footer>
        ) : null}
      </motion.div>
    </motion.div>
  )
}

export function Chat({ hidden, isLoggedIn, url }: PanelProps) {
  const [boot, setBoot] = useState<ChatBootData | null>(null)
  const [loadingBoot, setLoadingBoot] = useState(false)

  const loadBoot = useCallback(async () => {
    if (!url || !window.api?.getChatBoot) return null
    setLoadingBoot(true)
    try {
      const data = await window.api.getChatBoot({ url })
      if (data) setBoot(data)
      return data
    } finally {
      setLoadingBoot(false)
    }
  }, [url])

  useEffect(() => {
    if (!isLoggedIn || !url || hidden) return
    void loadBoot()
  }, [isLoggedIn, url, hidden, loadBoot])

  const showPlaceholder = !isLoggedIn || !url || !boot
  const showBootLoading = loadingBoot && !boot

  return (
    <motion.div
      className={`tab-panel absolute inset-0 flex min-h-0 flex-col overflow-hidden ${PANEL_BG_CLASS}`}
      initial={false}
      animate={hidden ? 'hidden' : 'visible'}
      variants={panelScreen}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: hidden ? 0 : 2
      }}
    >
      {showPlaceholder ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
          <p className="text-foreground text-[13px] font-semibold">Chatbot</p>
          <p className="text-muted-foreground mt-1 text-center text-[12px]">
            {!isLoggedIn || !url
              ? 'Configurez et connectez-vous pour accéder au chatbot.'
              : showBootLoading
                ? 'Chargement du chatbot…'
                : 'Impossible de charger le chatbot.'}
          </p>
        </div>
      ) : (
        <DiscuterChat hidden={hidden} url={url} boot={boot} onBootChange={setBoot} />
      )}
    </motion.div>
  )
}
