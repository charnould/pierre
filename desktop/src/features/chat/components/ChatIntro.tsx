import { Bubble, BubbleContent } from '@/shared/components/ui/bubble'
import type { ChatBoot } from '@/shared/types'

interface Props {
  boot: ChatBoot
  iconSrc: string
  showExamples: boolean
  onExample: (text: string) => void
}

export function ChatIntro({ boot, iconSrc, showExamples, onExample }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <img src={iconSrc} alt="" width={32} height={32} className="size-8" />
      {boot.greeting.length > 0 ? (
        <div className="typeset typeset-docs typeset-reply">
          {boot.greeting.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      {showExamples && boot.examples.length > 0 ? (
        <div className="flex flex-col items-end gap-2">
          {boot.examples.map((example) => (
            <Bubble key={example} variant="muted" align="end">
              <BubbleContent render={<button type="button" onClick={() => onExample(example)} />}>
                {example}
              </BubbleContent>
            </Bubble>
          ))}
        </div>
      ) : null}
    </div>
  )
}
