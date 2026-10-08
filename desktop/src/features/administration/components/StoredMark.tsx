import { Check, Circle } from 'lucide-react'

export function StoredMark({ name, stored = true }: { name: string; stored?: boolean }) {
  if (!stored) {
    return (
      <Circle
        aria-label={name}
        className="text-muted-foreground size-5 shrink-0"
        strokeWidth={1.5}
      />
    )
  }
  return (
    <span
      aria-label={name}
      className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full"
    >
      <Check aria-hidden className="size-3" strokeWidth={2.5} />
    </span>
  )
}
