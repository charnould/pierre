import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { useState, useEffect, useRef, useId } from 'react'

import { NeuronGrid } from '@/components/layout/NeuronGrid'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group'
import { PANEL_BG_CLASS } from '@/components/workflow/WorkflowPanelChrome'

import { doLogin } from '../../App'
import type { Settings } from '../../types'

interface Config {
  name: string
  headline: string
  organization: string
}

async function fetchLogo(baseUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(`${baseUrl}/customization/desktop/logo.svg`)
    if (!resp.ok) return null
    return await resp.text()
  } catch {
    return null
  }
}

interface Props {
  hidden: boolean
  settings: Settings
  isLoggedIn: boolean
  onLogin: (s: Settings, agentName?: string) => void
  onLogout: () => void
}

export async function fetchConfig(baseUrl: string): Promise<Config | null> {
  try {
    const resp = await fetch(`${baseUrl}/customization/desktop/config.json`)
    if (!resp.ok) return null
    return (await resp.json()) as Config
  } catch {
    return null
  }
}

export function Settings({ hidden, settings, isLoggedIn, onLogin, onLogout }: Props) {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [, setStatus] = useState<'ok' | 'error' | null>(null)
  const [loading, setLoading] = useState(false)
  const [Config, setConfig] = useState<Config | null>(null)
  const [logoSvg, setLogoSvg] = useState<string | null>(null)
  const [charterAccepted, setCharterAccepted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const urlId = useId()
  const emailId = useId()
  const passwordId = useId()
  const charterId = useId()

  // Measure container in pixels so NeuronGrid always gets explicit dimensions
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDims({ w: el.offsetWidth, h: el.offsetHeight })
    })
    ro.observe(el)
    setDims({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setUrl(settings.url ?? '')
    setEmail(settings.email ?? '')
    setPassword(settings.password ?? '')
    if (isLoggedIn) setStatus('ok')
    if (settings.url) {
      void fetchConfig(settings.url).then(setConfig)
      void fetchLogo(settings.url).then(setLogoSvg)
    }
  }, [settings, isLoggedIn])

  async function handleUrlBlur() {
    let baseUrl: string
    try {
      baseUrl = new URL(url.trim()).origin
    } catch {
      setConfig(null)
      setLogoSvg(null)
      setCharterAccepted(false)
      return
    }
    const b = await fetchConfig(baseUrl)
    setConfig(b)
    const logo = await fetchLogo(baseUrl)
    setLogoSvg(logo)
    setCharterAccepted(false)
  }

  async function handleSave() {
    console.log('[handleSave] called | url:', url, '| email:', email)
    let baseUrl: string
    try {
      baseUrl = new URL(url.trim()).origin
    } catch {
      setError('URL invalide. Exemple : http://localhost:3000')
      return
    }
    if (!email.trim() || !password.trim()) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    setError('')
    setLoading(true)
    const next: Settings = {
      url: baseUrl,
      email: email.trim(),
      password: password.trim(),
      loggedOut: false
    }

    try {
      await window.api.saveSettings(next)
      const ok = await doLogin(next)
      setStatus(ok ? 'ok' : 'error')
      if (ok) onLogin(next, Config?.name)
      else setError('Identifiant ou mot de passe incorrect.')
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez l'URL.")
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await window.api.saveSettings({
      ...settings,
      password: '',
      loggedOut: true
    })
    await window.api.logout()
    setPassword('')
    setStatus(null)
    onLogout()
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden ${PANEL_BG_CLASS}${hidden ? ' hidden' : ''}`}
    >
      {/* NeuronGrid — explicit pixel dims so canvas always resolves h-full correctly */}
      {dims.w > 0 && dims.h > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: dims.w, height: dims.h }}>
          <NeuronGrid active={true} color="#737373" />
        </div>
      )}

      {/* Card — centered over the grid */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="border-border bg-card w-full max-w-sm overflow-y-auto rounded-2xl border p-8 shadow-md">
          {/* Logo + greeting */}
          <div className="mb-8">
            {logoSvg && (
              <div className="mb-5 size-14" dangerouslySetInnerHTML={{ __html: logoSvg }} />
            )}
            {Config?.name && (
              <p className="text-foreground text-4xl leading-none font-bold">{Config.name}</p>
            )}
            {Config?.headline && (
              <p className="text-muted-foreground mt-1.5 text-base leading-snug font-light">
                {Config.headline}
              </p>
            )}
          </div>

          <form
            className="no-drag"
            onSubmit={(e) => {
              e.preventDefault()
              if (isLoggedIn) void handleLogout()
              else void handleSave()
            }}
          >
            <FieldSet className="gap-4">
              <FieldLegend className="sr-only">Connexion</FieldLegend>
              <FieldGroup className="gap-4">
                <Field className="gap-2">
                  <FieldLabel htmlFor={urlId}>Adresse du serveur</FieldLabel>
                  <Input
                    id={urlId}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => void handleUrlBlur()}
                    placeholder="https://exemple.pierre-ia.org"
                    autoComplete="url"
                    aria-invalid={!!error}
                  />
                </Field>

                <Field className="gap-2">
                  <FieldLabel htmlFor={emailId}>Email professionnel</FieldLabel>
                  <Input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="username"
                    aria-invalid={!!error}
                  />
                </Field>

                <Field className="gap-2">
                  <FieldLabel htmlFor={passwordId}>Mot de passe</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={passwordId}
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={!!error}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                {error ? (
                  <FieldError>
                    <span className="flex items-start gap-2">
                      <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
                      {error}
                    </span>
                  </FieldError>
                ) : null}

                <Field orientation="horizontal" className="items-start gap-3">
                  <Checkbox
                    id={charterId}
                    checked={isLoggedIn ? true : charterAccepted}
                    onCheckedChange={(checked) => {
                      if (!isLoggedIn) setCharterAccepted(checked === true)
                    }}
                    disabled={isLoggedIn}
                  />
                  <FieldLabel
                    htmlFor={charterId}
                    className="text-muted-foreground text-xs leading-snug font-normal text-balance"
                  >
                    J’ai pris connaissance et j’accepte la charte et/ou les consignes IA de mon
                    organisme.
                  </FieldLabel>
                </Field>
              </FieldGroup>

              {!isLoggedIn ? (
                <Button
                  type="submit"
                  disabled={loading || !charterAccepted}
                  className="mt-4 w-full py-5 text-[13px] font-bold"
                >
                  {loading ? 'Connexion…' : 'Se connecter →'}
                </Button>
              ) : (
                <Button type="submit" className="mt-4 w-full py-5 text-[13px] font-bold">
                  Se déconnecter
                </Button>
              )}
            </FieldSet>
          </form>
        </div>
      </div>
    </div>
  )
}
