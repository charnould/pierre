import { DesktopChatBody, type PendingChatPrompt } from '@/features/chat/DesktopChatBody'
import { cn } from '@/shared/lib/utils'

interface Props {
  hidden: boolean
  agentName: string
  url?: string
  chatbotIds?: readonly string[]
  configId?: string | null
  onConfigId?: (configId: string) => void
  pendingPrompt?: PendingChatPrompt | null
  onConsumePrompt?: (id: number) => void
}

export function ChatView({
  hidden,
  agentName,
  url,
  chatbotIds,
  configId,
  onConfigId,
  pendingPrompt,
  onConsumePrompt
}: Props) {
  return (
    <div
      data-tab-panel
      aria-label={`Discuter avec ${agentName}`}
      className={cn(
        'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <DesktopChatBody
        active={!hidden}
        agentName={agentName}
        url={url}
        chatbotIds={chatbotIds}
        configId={configId}
        onConfigId={onConfigId}
        pendingPrompt={pendingPrompt}
        onConsumePrompt={onConsumePrompt}
      />
    </div>
  )
}
