import { ChatPanel } from '@/features/chat/ChatPanel'
import { createHttpChatTransport } from '@/features/chat/lib/http-chat-transport'
import type { ChatBoot } from '@/shared/types'

const transport = createHttpChatTransport()

function readBoot(): ChatBoot {
  const el = document.getElementById('pierre-data')
  if (!el?.textContent) throw new Error('Missing #pierre-data script tag')
  return JSON.parse(el.textContent) as ChatBoot
}

export function ChatWebApp() {
  const boot = readBoot()
  return (
    <ChatPanel arrival boot={boot} transport={transport} scroll={boot.embed ? 'panel' : 'window'} />
  )
}
