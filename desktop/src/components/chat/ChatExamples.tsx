import type { ChatStatus } from '../../hooks/usePierreChat'
import { isChatGenerating } from './chatUtils'

interface Props {
  examples: string[]
  status: ChatStatus
  onSelect: (text: string) => void
}

export function ChatExamples({ examples, status, onSelect }: Props) {
  if (examples.length === 0) return null

  const disabled = isChatGenerating(status)

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide">EXEMPLES</p>
      <div className="flex flex-col gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onSelect(example)}
            disabled={disabled}
            className="border-border text-muted-foreground hover:border-ring/30 hover:bg-muted disabled:text-muted-foreground block w-fit max-w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm leading-snug text-balance disabled:cursor-progress disabled:hover:bg-transparent"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
