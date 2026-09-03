import { cn } from '@/shared/lib/utils'

interface Props {
  examples: string[]
  onExample: (text: string) => void
  onPreview?: (text: string | null) => void
  quiet?: boolean
}

export function ChatPublicEmpty({ examples, onExample, onPreview, quiet = false }: Props) {
  if (examples.length === 0) return null

  return (
    <div
      className={cn(
        'w-full',
        !quiet && 'border-border bg-popover text-popover-foreground rounded-xl border'
      )}
    >
      <ul className={cn(!quiet && 'divide-border/60 divide-y')} aria-label="Questions proposées">
        {examples.map((example) => (
          <li key={example}>
            <button
              type="button"
              dir="auto"
              className={cn(
                'focus-visible:border-ring focus-visible:ring-ring/50 w-full px-3 text-start text-sm leading-snug outline-none focus-visible:ring-3',
                quiet
                  ? 'text-muted-foreground hover:text-foreground py-2'
                  : 'hover:bg-muted/50 py-2.5'
              )}
              onMouseEnter={() => onPreview?.(example)}
              onMouseLeave={() => onPreview?.(null)}
              onFocus={() => onPreview?.(example)}
              onBlur={() => onPreview?.(null)}
              onClick={() => onExample(example)}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
