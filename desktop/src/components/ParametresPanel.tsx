import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { doLogin } from '../App'
import type { Settings } from '../types'

interface Branding {
  title: string
  subtitle: string
  organisme: string
  charter: string
  logo: string
}

interface Props {
  hidden: boolean
  settings: Settings
  isLoggedIn: boolean
  onLogin: (s: Settings) => void
  onLogout: () => void
}

async function fetchBranding(baseUrl: string): Promise<Branding | null> {
  try {
    const resp = await fetch(`${baseUrl}/assets/default/branding.json`)
    if (!resp.ok) return null
    return (await resp.json()) as Branding
  } catch {
    return null
  }
}

export function ParametresPanel({ hidden, settings, isLoggedIn, onLogin, onLogout }: Props) {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [, setStatus] = useState<'ok' | 'error' | null>(null)
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState<Branding | null>(null)
  const [charterAccepted, setCharterAccepted] = useState(false)

  useEffect(() => {
    setUrl(settings.url ?? '')
    setEmail(settings.email ?? '')
    setPassword(settings.password ?? '')
    if (isLoggedIn) setStatus('ok')
    if (settings.url) {
      void fetchBranding(settings.url).then(setBranding)
    }
  }, [settings, isLoggedIn])

  async function handleUrlBlur() {
    let baseUrl: string
    try {
      baseUrl = new URL(url.trim()).origin
    } catch {
      setBranding(null)
      setCharterAccepted(false)
      return
    }
    const b = await fetchBranding(baseUrl)
    setBranding(b)
    setCharterAccepted(false)
  }

  async function handleSave() {
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
      if (ok) onLogin(next)
      else setError('Identifiant ou mot de passe incorrect.')
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez l'URL.")
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await window.api.saveSettings({ ...settings, password: '', loggedOut: true })
    await window.api.logout()
    setPassword('')
    setStatus(null)
    onLogout()
  }

  return (
    <div className={`flex flex-1 flex-col justify-between p-8${hidden ? ' hidden' : ''}`}>
      {/* top */}
      <div>
        {branding?.logo && (
          <div className="mt-10 mb-4 size-12" dangerouslySetInnerHTML={{ __html: branding.logo }} />
        )}
        <h1 className="mt-20 mb-4 text-7xl font-bold tracking-tight">
          {branding?.title ?? 'Pierre'}{' '}
          <span className="bg-foreground inline-block w-9 animate-[blink_1s_step-end_infinite] leading-none">
            &nbsp;
          </span>
        </h1>
        <h2 className="mb-5 text-[39px]/[41px] font-normal tracking-tight text-balance">
          {branding?.subtitle ?? 'Agent IA open source au service des HLM'}
        </h2>
      </div>

      {/* bottom */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold tracking-wider uppercase">
            Adresse du serveur
          </Label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => void handleUrlBlur()}
            placeholder="https://exemple.pierre-ia.org"
            className="bg-muted/40 h-10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold tracking-wider uppercase">
            Email professionnel
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="bg-muted/40 h-10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold tracking-wider uppercase">Mot de passe</Label>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-muted/40 h-10 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPw((v) => !v)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>

        {error && (
          <div className="border-destructive/25 bg-destructive/8 text-destructive flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5">
            <AlertCircle className="mt-px size-4 shrink-0" />
            <p className="text-[12px] leading-snug">{error}</p>
          </div>
        )}

        {!isLoggedIn && branding?.charter && (
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={charterAccepted}
              onChange={(e) => setCharterAccepted(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-[12px] leading-snug">
              J'ai pris connaissance de la charte IA de {branding.organisme}
            </span>
          </label>
        )}

        {!isLoggedIn ? (
          <Button
            onClick={() => void handleSave()}
            disabled={loading || (!!branding?.charter && !charterAccepted)}
            className="w-full py-5 text-[13px] font-bold"
          >
            {loading ? 'Connexion…' : 'Se connecter →'}
          </Button>
        ) : (
          <Button onClick={() => void handleLogout()} className="w-full py-5 text-[13px] font-bold">
            Se déconnecter
          </Button>
        )}
      </div>
    </div>
  )
}
