import { useEffect, useState, useSyncExternalStore } from 'react'

import { preloadTab } from '@/app/preload-tab'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ProfileSelector } from '@/features/chat/components/ProfileSelector'
import { moduleReady, subscribeCustomization } from '@/shared/lib/instance-customization'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { ChatBoot } from '@/shared/types'

interface Props {
  url?: string
  agentName: string
  chatbotIds: readonly string[]
  configId: string | null
  onConfigId: (configId: string) => void
  onSubmitPrompt: (text: string) => void
}

export function homeComposerPlaceholder(): string {
  return `Comment puis-je vous aider ?`
}

export function HomePromptComposer({
  url,
  agentName,
  chatbotIds,
  configId,
  onConfigId,
  onSubmitPrompt
}: Props) {
  const [boot, setBoot] = useState<ChatBoot | null>(null)
  const chatbotReady = useSyncExternalStore(subscribeCustomization, () => moduleReady('chatbot'))
  const assigned = chatbotIds.join(',')

  useEffect(() => {
    if (!url || !window.api?.getChatBoot) return
    let cancelled = false
    void window.api.getChatBoot({ url }).then(
      (data) => {
        if (!cancelled) setBoot(data ?? null)
      },
      (error) => {
        if (!cancelled) warnRenderer('HomePromptComposer.boot', error)
      }
    )
    return () => {
      cancelled = true
    }
  }, [assigned, chatbotReady, url])

  const activeId = configId ?? boot?.configId ?? ''

  return (
    <div
      data-slot="home-composer"
      className="home-composer min-w-0"
      onPointerEnter={() => preloadTab('chat')}
      onFocusCapture={() => preloadTab('chat')}
    >
      <ChatComposer
        appearance="form"
        status="ready"
        files={[]}
        previewUrls={[]}
        fileErrors={[]}
        dropActive={false}
        placeholder={homeComposerPlaceholder()}
        composerAccessory={
          boot ? (
            <ProfileSelector
              configs={boot.displayableConfigs}
              activeId={activeId}
              agentName={agentName}
              onSelect={onConfigId}
            />
          ) : null
        }
        onSend={(text) => onSubmitPrompt(text)}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    </div>
  )
}
