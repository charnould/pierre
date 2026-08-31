import { formatUpdateDate } from '@/features/updates/lib/format-update-date'

type UpdatesEntryMetaProps = {
  date: string
}

export function UpdatesEntryMeta({ date }: UpdatesEntryMetaProps) {
  return (
    <span className="text-muted-foreground text-xs tabular-nums">{formatUpdateDate(date)}</span>
  )
}
