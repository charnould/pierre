import { AudioLines, Mic } from 'lucide-react'

import { Spinner } from '@/shared/components/ui/spinner'

import type { DictationPhase } from './VoiceDictationContext'

export function dictationWave(level: number): '0' | '1' | '2' | '3' | '4' {
  if (level >= 0.78) return '4'
  if (level >= 0.56) return '3'
  if (level >= 0.34) return '2'
  if (level >= 0.12) return '1'
  return '0'
}

/** Mic at rest, AudioLines bars following the voice, spinner while transcribing. */
export function DictationMark({ phase, level = 0 }: { phase: DictationPhase; level?: number }) {
  if (phase === 'transcribing') return <Spinner />
  if (phase !== 'recording') return <Mic />
  return (
    <AudioLines
      data-dictation-wave={dictationWave(level)}
      className="text-foreground size-4"
      strokeWidth={1.5}
    />
  )
}
