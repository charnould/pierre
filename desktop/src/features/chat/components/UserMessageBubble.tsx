import { motion } from 'motion/react'
import { Streamdown } from 'streamdown'

import { Message, MessageContent } from '@/features/chat/components/ai/message'

import { CHAT_USER_PROSE_CLASS } from './chat-utils'

interface Props {
  content: string
}

export function UserMessageBubble({ content }: Props) {
  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <Message from="user">
        <MessageContent className={CHAT_USER_PROSE_CLASS}>
          <Streamdown isAnimating={false}>{content}</Streamdown>
        </MessageContent>
      </Message>
    </motion.div>
  )
}
