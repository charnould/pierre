import { Streamdown } from 'streamdown'

interface Props {
  content: string
}

export function UserMessageBubble({ content }: Props) {
  return (
    <div className="user-message-bubble mt-6 ml-auto max-w-[85%]">
      <Streamdown isAnimating={false}>{content}</Streamdown>
    </div>
  )
}
