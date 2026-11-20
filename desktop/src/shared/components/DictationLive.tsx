import { SquareIcon } from 'lucide-react'

import { DictationMark } from '@/shared/components/DictationMark'
import { Button } from '@/shared/components/ui/button'

export function DictationLive({ level, onStop }: { level: number; onStop: () => void }) {
  return (
    <span className="flex items-center gap-1">
      <DictationMark phase="recording" level={level} />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Arrêter la dictée"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onStop}
      >
        <SquareIcon />
      </Button>
    </span>
  )
}
