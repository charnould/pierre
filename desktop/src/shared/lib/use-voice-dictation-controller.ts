import { type DictationRecording, startDictationRecording } from '@pierre/shared/audio-recorder'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { insertIntoTextarea } from '@/shared/lib/insert-into-textarea'
import type { DictationPhase, VoiceDictation } from '@/shared/lib/voice-dictation-context'

export type VoiceDictationControllerOptions = {
  enabled: boolean
  deviceId?: string
  /** Optional preflight (e.g. URL check or OS permission). Return false to abort start. */
  beforeStart?: () => Promise<boolean> | boolean
  /** Transcribe PCM16 audio into text to insert. Throw with a user-facing message on error. */
  transcribe: (pcm: Uint8Array) => Promise<string | null>
  /** Surface an error message, or `null` to clear a previous banner error. */
  onError: (message: string | null) => void
  /** Message when the clip is too short to produce PCM audio (omit to ignore silently). */
  tooShortMessage?: string
  micErrorMessage?: string
  transcribeErrorMessage?: string
}

export type VoiceDictationController = {
  value: VoiceDictation
  phaseRef: RefObject<DictationPhase>
  start: (field: HTMLTextAreaElement) => Promise<void>
  finish: () => Promise<void>
  cancel: () => void
}

export function useVoiceDictationController({
  enabled,
  deviceId = 'default',
  beforeStart,
  transcribe,
  onError,
  tooShortMessage,
  micErrorMessage = 'Impossible d’accéder au microphone.',
  transcribeErrorMessage = 'La transcription a échoué.'
}: VoiceDictationControllerOptions): VoiceDictationController {
  const [phase, setPhase] = useState<DictationPhase>('idle')
  const [target, setTarget] = useState<HTMLTextAreaElement | null>(null)
  const [level, setLevel] = useState(0)

  const recordingRef = useRef<DictationRecording | null>(null)
  const targetRef = useRef<HTMLTextAreaElement | null>(null)
  const phaseRef = useRef<DictationPhase>('idle')
  const startingRef = useRef(false)
  const sessionTokenRef = useRef(0)

  const setPhaseNow = useCallback((next: DictationPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const reset = useCallback(() => {
    recordingRef.current = null
    targetRef.current = null
    setTarget(null)
    setLevel(0)
    setPhaseNow('idle')
  }, [setPhaseNow])

  const cancel = useCallback(() => {
    sessionTokenRef.current += 1
    startingRef.current = false
    recordingRef.current?.cancel()
    reset()
  }, [reset])

  useEffect(
    () => () => {
      sessionTokenRef.current += 1
      recordingRef.current?.cancel()
    },
    []
  )

  useEffect(() => {
    if (phase !== 'recording') return
    const timer = window.setInterval(() => {
      setLevel(recordingRef.current?.level() ?? 0)
    }, 65)
    return () => window.clearInterval(timer)
  }, [phase])

  const finish = useCallback(async () => {
    const recording = recordingRef.current
    const field = targetRef.current
    if (!recording || !field) {
      reset()
      return
    }
    const token = sessionTokenRef.current
    recordingRef.current = null
    setPhaseNow('transcribing')
    setLevel(0)
    try {
      const pcm = await recording.stop()
      if (token !== sessionTokenRef.current) return
      if (!pcm) {
        if (tooShortMessage) onError(tooShortMessage)
        return
      }
      const text = await transcribe(pcm)
      if (token !== sessionTokenRef.current) return
      onError(null)
      if (text?.trim()) {
        insertIntoTextarea(field, text)
      }
    } catch (error) {
      if (token !== sessionTokenRef.current) return
      const message =
        error instanceof Error && error.message ? error.message : transcribeErrorMessage
      onError(message)
    } finally {
      if (token === sessionTokenRef.current) {
        reset()
      }
    }
  }, [onError, reset, setPhaseNow, tooShortMessage, transcribe, transcribeErrorMessage])

  const start = useCallback(
    async (field: HTMLTextAreaElement) => {
      if (!enabled || startingRef.current || phaseRef.current !== 'idle') return
      const token = ++sessionTokenRef.current
      startingRef.current = true
      onError(null)
      try {
        if (beforeStart) {
          const allowed = await beforeStart()
          if (!allowed || token !== sessionTokenRef.current) return
        }
        const recording = await startDictationRecording(deviceId)
        if (token !== sessionTokenRef.current) {
          recording.cancel()
          return
        }
        recordingRef.current = recording
        targetRef.current = field
        setTarget(field)
        setPhaseNow('recording')
      } catch {
        if (token === sessionTokenRef.current) {
          reset()
          onError(micErrorMessage)
        }
      } finally {
        if (token === sessionTokenRef.current) {
          startingRef.current = false
        }
      }
    },
    [beforeStart, deviceId, enabled, micErrorMessage, onError, reset, setPhaseNow]
  )

  const toggle = useCallback(
    (field: HTMLTextAreaElement | null) => {
      if (!enabled || !field || phaseRef.current === 'transcribing') return
      if (phaseRef.current === 'recording') {
        if (targetRef.current === field) {
          void finish()
          return
        }
        cancel()
      }
      void start(field)
    },
    [cancel, enabled, finish, start]
  )

  const value = useMemo<VoiceDictation>(
    () => ({ enabled, phase, target, level, toggle, cancel }),
    [cancel, enabled, level, phase, target, toggle]
  )

  return { value, phaseRef, start, finish, cancel }
}
