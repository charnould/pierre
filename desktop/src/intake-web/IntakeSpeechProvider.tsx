import { type ReactNode, useCallback } from 'react'

import { useVoiceDictationController } from '@/shared/lib/use-voice-dictation-controller'
import { VoiceDictationContext } from '@/shared/lib/voice-dictation-context'

function canRecordAudio(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

export function IntakeSpeechProvider({
  speechUrl,
  onError,
  children
}: {
  speechUrl: string | null
  onError: (message: string | null) => void
  children: ReactNode
}) {
  const transcribe = useCallback(
    async (pcm: Uint8Array) => {
      if (!speechUrl) return null
      const response = await fetch(speechUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: pcm as unknown as BodyInit
      })
      const payload = (await response.json().catch(() => null)) as {
        data?: { text?: string }
        error?: { message?: string }
      } | null
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'La transcription a échoué.')
      }
      return payload?.data?.text ?? null
    },
    [speechUrl]
  )

  const { value } = useVoiceDictationController({
    enabled: Boolean(speechUrl) && canRecordAudio(),
    transcribe,
    onError,
    tooShortMessage: 'Dictée trop courte. Parlez un peu plus longtemps.',
    micErrorMessage: 'Impossible d’accéder au microphone.',
    transcribeErrorMessage: 'Impossible de transcrire la dictée.'
  })

  return <VoiceDictationContext.Provider value={value}>{children}</VoiceDictationContext.Provider>
}
