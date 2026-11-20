import { ActivityReaderView } from '@/features/activity/components/ActivityReaderView'
import type { ReaderTarget } from '@/features/activity/lib/reader-target'

interface Props {
  target: ReaderTarget
  url?: string
}

/** Lecteur plein panneau contenu — titlebar reste visible. */
export function ActivityReaderOverlay({ target, url }: Props) {
  return (
    <div className="bg-background absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden">
      <ActivityReaderView target={target} url={url} />
    </div>
  )
}
