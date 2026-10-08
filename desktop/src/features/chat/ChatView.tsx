import { DesktopChatBody } from '@/features/chat/DesktopChatBody'
import { cn } from '@/shared/lib/utils'

interface Props {
  hidden: boolean
  agentName: string
  url?: string
}

export function ChatView({ hidden, agentName, url }: Props) {
  return (
    <div
      data-tab-panel
      aria-label={`Discuter avec ${agentName}`}
      className={cn(
        'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <DesktopChatBody active={!hidden} agentName={agentName} url={url} />
    </div>
  )
}
