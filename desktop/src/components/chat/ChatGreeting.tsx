import { Streamdown } from 'streamdown'

interface Props {
  greeting: string[]
}

export function ChatGreeting({ greeting }: Props) {
  return (
    <div className="text-foreground text-sm">
      <Streamdown isAnimating={false}>{greeting.join('\n\n')}</Streamdown>
    </div>
  )
}
