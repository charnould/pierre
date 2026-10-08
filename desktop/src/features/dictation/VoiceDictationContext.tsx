import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { toast } from '@/shared/components/ui/toast'
import { type DictationSettings, type Settings } from '@/shared/types'

import { type DictationRecording, startDictationRecording } from './lib/audio-recorder'
import { insertIntoTextarea } from './lib/insert-into-textarea'
import { DEFAULT_DICTATION_SHORTCUT, matchShortcut, parseShortcut } from './lib/shortcut'

export type DictationPhase = 'idle' | 'recording' | 'transcribing'

type VoiceDictation = {
  enabled: boolean
  phase: DictationPhase
  target: HTMLTextAreaElement | null
  level: number
  toggle: (field: HTMLTextAreaElement | null) => void
  cancel: () => void
}

const VoiceDictationContext = createContext<VoiceDictation | null>(null)

export function useVoiceDictationOptional(): VoiceDictation | null {
  return useContext(VoiceDictationContext)
}

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
  const [phase, setPhase] = useState<DictationPhase>('idle')
  const [target, setTarget] = useState<HTMLTextAreaElement | null>(null)
  const [level, setLevel] = useState(0)
  const recording = useRef<DictationRecording | null>(null)
  const phaseRef = useRef<DictationPhase>('idle')
  const setPhaseNow = useCallback((next: DictationPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const cancel = useCallback(() => {
    recording.current?.cancel()
    recording.current = null
    setPhaseNow('idle')
    setTarget(null)
    setLevel(0)
  }, [setPhaseNow])

  const finish = useCallback(async () => {
    const field = target
    const current = recording.current
    recording.current = null
    if (!field || !current) {
      setPhaseNow('idle')
      return
    }
    setPhaseNow('transcribing')
    try {
      const pcm = await current.stop()
      const url = settings.url
      if (pcm && url && window.api?.transcribeDictation) {
        const result = await window.api.transcribeDictation({ url, pcm })
        if (result.text.trim()) insertIntoTextarea(field, result.text)
      }
    } catch (error) {
      toast.add({
        title: error instanceof Error ? error.message : 'La transcription a échoué.',
        type: 'error'
      })
    } finally {
      setPhaseNow('idle')
      setTarget(null)
      setLevel(0)
    }
  }, [setPhaseNow, settings.url, target])

  const start = useCallback(
    async (field: HTMLTextAreaElement) => {
      if (!dictation.enabled || phaseRef.current !== 'idle') return
      if (!settings.url) {
        toast.add({ title: 'Connectez-vous pour dicter.', type: 'error' })
        return
      }
      try {
        await window.api?.requestMicrophoneAccess?.()
        const next = await startDictationRecording(dictation.deviceId)
        recording.current = next
        setTarget(field)
        setPhaseNow('recording')
      } catch {
        toast.add({ title: 'Le microphone est inaccessible.', type: 'error' })
      }
    },
    [dictation.deviceId, dictation.enabled, setPhaseNow, settings.url]
  )

  const toggle = useCallback(
    (field: HTMLTextAreaElement | null) => {
      if (phaseRef.current === 'transcribing') return
      if (phaseRef.current === 'recording') {
        void finish()
        return
      }
      if (field) void start(field)
    },
    [finish, start]
  )

  useEffect(() => {
    if (phase !== 'recording') return
    const timer = window.setInterval(() => setLevel(recording.current?.level() ?? 0), 70)
    return () => window.clearInterval(timer)
  }, [phase])

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
      if (!dictation.pushToTalk || phaseRef.current !== 'recording' || !chord) return
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
  }, [cancel, dictation.enabled, dictation.pushToTalk, dictation.shortcut, finish, start])

  const value = useMemo<VoiceDictation>(
    () => ({ enabled: dictation.enabled, phase, target, level, toggle, cancel }),
    [cancel, dictation.enabled, level, phase, target, toggle]
  )

  return <VoiceDictationContext.Provider value={value}>{children}</VoiceDictationContext.Provider>
}
