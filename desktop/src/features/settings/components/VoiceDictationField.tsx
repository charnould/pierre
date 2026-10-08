import { useCallback, useEffect, useId, useState } from 'react'

import {
  type DictationRecording,
  startDictationRecording
} from '@/features/dictation/lib/audio-recorder'
import {
  DEFAULT_DICTATION_SHORTCUT,
  shortcutFromEvent,
  shortcutLabels
} from '@/features/dictation/lib/shortcut'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { toast } from '@/shared/components/ui/toast'
import type { DictationSettings, Settings } from '@/shared/types'

function current(settings: Settings) {
  return {
    enabled: settings.dictation?.enabled !== false,
    deviceId: settings.dictation?.deviceId || 'default',
    shortcut: settings.dictation?.shortcut || DEFAULT_DICTATION_SHORTCUT,
    pushToTalk: settings.dictation?.pushToTalk !== false
  }
}

export function VoiceDictationField({
  settings,
  onSettingsChange
}: {
  settings: Settings
  onSettingsChange?: (settings: Settings) => void
}) {
  const enabledId = useId()
  const deviceId = useId()
  const talkId = useId()
  const dictation = current(settings)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [capturingShortcut, setCapturingShortcut] = useState(false)
  const [testing, setTesting] = useState(false)
  const [sample, setSample] = useState('')
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    void navigator.mediaDevices.enumerateDevices().then((listed) => {
      setDevices(listed.filter((device) => device.kind === 'audioinput'))
    })
  }, [])

  const persist = useCallback(
    async (patch: DictationSettings) => {
      const next = { ...settings, dictation: { ...dictation, ...patch } }
      await window.api?.saveSettings(next)
      onSettingsChange?.(next)
    },
    [dictation, onSettingsChange, settings]
  )

  useEffect(() => {
    if (!capturingShortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      if (event.key === 'Escape') {
        setCapturingShortcut(false)
        return
      }
      if (event.key === 'Backspace') {
        void persist({ shortcut: DEFAULT_DICTATION_SHORTCUT })
        setCapturingShortcut(false)
        return
      }
      const shortcut = shortcutFromEvent(event)
      if (!shortcut) return
      void persist({ shortcut })
      setCapturingShortcut(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capturingShortcut, persist])

  async function testMicrophone() {
    if (testing) return
    setTesting(true)
    setSample('')
    let recording: DictationRecording | null = null
    try {
      await window.api?.requestMicrophoneAccess?.()
      recording = await startDictationRecording(dictation.deviceId)
      const timer = window.setInterval(() => setLevel(recording?.level() ?? 0), 120)
      window.setTimeout(() => {
        window.clearInterval(timer)
        void recording?.stop().then(async (pcm) => {
          setLevel(0)
          setTesting(false)
          if (!pcm || !settings.url || !window.api?.transcribeDictation) {
            setSample(pcm ? '' : 'Aucun signal utilisable.')
            return
          }
          const result = await window.api.transcribeDictation({ url: settings.url, pcm })
          setSample(result.text.trim() || 'Aucun mot reconnu.')
        })
      }, 2000)
    } catch {
      recording?.cancel()
      setTesting(false)
      toast.add({ title: 'Le microphone est inaccessible.', type: 'error' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dictée vocale</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup variant="rows">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={enabledId}>Activer la dictée vocale</FieldLabel>
              <FieldDescription>
                Le serveur transcrit la voix dans le champ en cours. Rien n’est enregistré.
              </FieldDescription>
            </FieldContent>
            <Switch
              id={enabledId}
              className="justify-self-end"
              checked={dictation.enabled}
              onCheckedChange={(enabled) => void persist({ enabled })}
            />
          </Field>
          {dictation.enabled ? (
            <>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={deviceId}>Périphérique d’entrée</FieldLabel>
                  <FieldDescription>Microphone utilisé pour la dictée.</FieldDescription>
                </FieldContent>
                <Select
                  value={dictation.deviceId}
                  onValueChange={(device) => {
                    if (device) void persist({ deviceId: device })
                  }}
                >
                  <SelectTrigger id={deviceId} className="justify-self-end">
                    <SelectValue placeholder="Par défaut du système" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Par défaut du système</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || 'Microphone'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel>Confidentialité du microphone</FieldLabel>
                  <FieldDescription>Autorisation demandée par le système.</FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-end"
                  onClick={() => void window.api?.openMicrophoneSettings?.()}
                >
                  Ouvrir les réglages
                </Button>
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel>Tester le microphone</FieldLabel>
                  <FieldDescription>
                    {testing
                      ? level > 0.08
                        ? 'Signal reçu.'
                        : 'Écoute…'
                      : sample || 'Deux secondes, puis la transcription.'}
                  </FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-end"
                  disabled={testing}
                  onClick={() => void testMicrophone()}
                >
                  Tester le micro
                </Button>
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel>Raccourci</FieldLabel>
                  <FieldDescription>
                    {capturingShortcut
                      ? 'Appuyez sur le raccourci. Échap annule.'
                      : 'Déclenche la dictée dans le champ actif.'}
                  </FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-end"
                  aria-label="Modifier le raccourci de dictée"
                  onClick={() => setCapturingShortcut(true)}
                >
                  <KbdGroup>
                    {shortcutLabels(dictation.shortcut).map((label) => (
                      <Kbd key={label}>{label}</Kbd>
                    ))}
                  </KbdGroup>
                </Button>
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={talkId}>Appuyer pour parler</FieldLabel>
                  <FieldDescription>
                    Maintenir le raccourci pour dicter. Relâcher transcrit.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={talkId}
                  className="justify-self-end"
                  checked={dictation.pushToTalk}
                  onCheckedChange={(pushToTalk) => void persist({ pushToTalk })}
                />
              </Field>
            </>
          ) : null}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
