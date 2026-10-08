interface Props {
  examples: string[]
  onExample: (text: string) => void
  onPreview?: (text: string | null) => void
}

export function ChatPublicEmpty({ examples, onExample, onPreview }: Props) {
  if (examples.length === 0) return null

  return (
    <div className="border-border bg-popover text-popover-foreground w-full rounded-xl border">
      <ul className="divide-border/60 divide-y" aria-label="Questions proposées">
        {examples.map((example) => (
          <li key={example}>
            <button
              type="button"
              dir="auto"
              className="hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 w-full px-3 py-2.5 text-start text-sm leading-snug outline-none focus-visible:ring-3"
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
