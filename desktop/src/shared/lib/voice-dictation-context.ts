import { createContext, useContext } from 'react'

export type DictationPhase = 'idle' | 'recording' | 'transcribing'

export type VoiceDictation = {
  enabled: boolean
  phase: DictationPhase
  target: HTMLTextAreaElement | null
  level: number
  toggle: (field: HTMLTextAreaElement | null) => void
  cancel: () => void
}

export const VoiceDictationContext = createContext<VoiceDictation | null>(null)

export function useVoiceDictationOptional(): VoiceDictation | null {
  return useContext(VoiceDictationContext)
}
