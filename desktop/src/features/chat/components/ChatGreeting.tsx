import { Streamdown } from 'streamdown'

import { CHAT_CONTENT_MAX_W } from './chat-utils'

interface Props {
  greeting: string[]
}

export function ChatGreeting({ greeting }: Props) {
  if (greeting.length === 0) return null

  return (
    <header className={`llm-answer text-foreground ${CHAT_CONTENT_MAX_W} text-pretty`}>
      <Streamdown isAnimating={false}>{greeting.join('\n\n')}</Streamdown>
    </header>
  )
}
