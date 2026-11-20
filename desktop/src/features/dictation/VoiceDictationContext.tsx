import { type ReactNode, useCallback, useEffect } from 'react'

import { toast } from '@/shared/components/ui/toast'
import { useVoiceDictationController } from '@/shared/lib/use-voice-dictation-controller'
import { VoiceDictationContext } from '@/shared/lib/voice-dictation-context'
import { type DictationSettings, type Settings } from '@/shared/types'

import { DEFAULT_DICTATION_SHORTCUT, matchShortcut, parseShortcut } from './lib/shortcut'

function resolve(value: DictationSettings | undefined) {
  return {
    enabled: value?.enabled !== false,
    deviceId: value?.deviceId || 'default',
    shortcut: value?.shortcut || DEFAULT_DICTATION_SHORTCUT,
    pushToTalk: value?.pushToTalk !== false
  }
}

export function VoiceDictationProvider({
  settings,
  children
}: {
  settings: Settings
  children: ReactNode
}) {
  const dictation = resolve(settings.dictation)

  const handleError = useCallback((message: string | null) => {
    if (message) toast.add({ title: message, type: 'error' })
  }, [])

  const beforeStart = useCallback(async () => {
    if (!settings.url) {
      toast.add({ title: 'Connectez-vous pour dicter.', type: 'error' })
      return false
    }
    await window.api?.requestMicrophoneAccess?.()
    return true
  }, [settings.url])

  const transcribe = useCallback(
    async (pcm: Uint8Array) => {
      if (!settings.url || !window.api?.transcribeDictation) return null
      const result = await window.api.transcribeDictation({ url: settings.url, pcm })
      return result.text
    },
    [settings.url]
  )

  const { value, phaseRef, start, finish, cancel } = useVoiceDictationController({
    enabled: dictation.enabled,
    deviceId: dictation.deviceId,
    beforeStart,
    transcribe,
    onError: handleError,
    micErrorMessage: 'Le microphone est inaccessible.',
    transcribeErrorMessage: 'La transcription a échoué.'
  })

  useEffect(() => {
    if (!dictation.enabled) return
    const chord = parseShortcut(dictation.shortcut)
    if (!chord) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const field = document.activeElement
      if (event.key === 'Escape' && phaseRef.current === 'recording') {
        event.preventDefault()
        cancel()
        return
      }
      if (!matchShortcut(event, chord)) return
      if (!(field instanceof HTMLTextAreaElement) && phaseRef.current !== 'recording') return
      event.preventDefault()
      if (phaseRef.current === 'recording') {
        if (!dictation.pushToTalk) void finish()
        return
      }
      if (field instanceof HTMLTextAreaElement) void start(field)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (!dictation.pushToTalk || phaseRef.current !== 'recording') return
      if (event.code !== chord.code) return
      event.preventDefault()
      void finish()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [cancel, dictation.enabled, dictation.pushToTalk, dictation.shortcut, finish, phaseRef, start])

  return <VoiceDictationContext.Provider value={value}>{children}</VoiceDictationContext.Provider>
}
