import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

import { loginWithStoredCredentials } from '@/features/auth/credentials'
import {
  LOGIN_BRAND_NAME,
  LOGIN_CARD,
  LOGIN_FIELD_GROUP,
  LOGIN_FIELD_SET,
  LOGIN_FIELD_STACK,
  LOGIN_HEADLINE,
  LOGIN_LEGAL_LABEL,
  LOGIN_PANEL,
  LOGIN_SHELL,
  SETTINGS_FIELD_LABEL
} from '@/features/settings/settings-chrome'
import { EASE, panelScreen } from '@/features/workflow/components/WorkflowPanelChrome'
import { DotGridBackground } from '@/shared/components/layout/DotGridBackground'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/shared/components/ui/input-group'
import { deskControlVariants } from '@/shared/lib/desk-control'
import {
  connectionFieldInvalid,
  loginErrorKind,
  loginErrorLabel,
  type ConnectionErrorKind
} from '@/shared/lib/login-errors'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { Settings } from '@/shared/types'

import { fetchConfig, type DesktopConfig } from './settings-config'

interface Props {
  settings: Settings
  onLogin: (s: Settings, meta?: { agentName?: string }) => void
}

async function fetchLogo(baseUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(`${baseUrl}/customization/desktop/logo.svg`)
    if (!resp.ok) return null
    return await resp.text()
  } catch (error) {
    warnRenderer('LoginPanel.fetchLogo', error)
    return null
  }
}

export function LoginPanel({ settings, onLogin }: Props) {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState<ConnectionErrorKind>(null)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<DesktopConfig | null>(null)
  const [logoSvg, setLogoSvg] = useState<string | null>(null)
  const [charterAccepted, setCharterAccepted] = useState(false)
  const [aiDisclaimerAccepted, setAiDisclaimerAccepted] = useState(false)
  const urlId = useId()
  const emailId = useId()
  const passwordId = useId()
  const charterId = useId()
  const aiDisclaimerId = useId()

  useEffect(() => {
    setUrl(settings.url ?? '')
    setEmail(settings.email ?? '')
    if (!settings.loggedOut) setPassword(settings.password ?? '')
    if (settings.url) {
      void fetchConfig(settings.url).then(setConfig)
      void fetchLogo(settings.url).then(setLogoSvg)
    }
  }, [settings])

  async function handleUrlBlur() {
    let baseUrl: string
    try {
      baseUrl = new URL(url.trim()).origin
    } catch {
      setConfig(null)
      setLogoSvg(null)
      setCharterAccepted(false)
      setAiDisclaimerAccepted(false)
      return
    }
    const nextConfig = await fetchConfig(baseUrl)
    setConfig(nextConfig)
    const logo = await fetchLogo(baseUrl)
    setLogoSvg(logo)
    setCharterAccepted(false)
    setAiDisclaimerAccepted(false)
  }

  async function handleSubmit() {
    let baseUrl: string
    try {
      baseUrl = new URL(url.trim()).origin
    } catch {
      setErrorKind('validation')
      setError('URL invalide. Exemple : http://localhost:3000')
      return
    }
    if (!email.trim() || !password.trim()) {
      setErrorKind('validation')
      setError('Tous les champs sont obligatoires.')
      return
    }

    setError('')
    setErrorKind(null)
    setLoading(true)
    const next: Settings = {
      url: baseUrl,
      email: email.trim(),
      password: password.trim(),
      loggedOut: false
    }

    try {
      const result = await loginWithStoredCredentials(next)
      if (result.ok) {
        await window.api.saveSettings(next)
        onLogin(next, { agentName: config?.name })
      } else {
        const code = !result.ok ? result.message : undefined
        setErrorKind(loginErrorKind(code))
        setError(loginErrorLabel(code))
      }
    } catch (err) {
      warnRenderer('LoginPanel.handleSubmit', err)
      setErrorKind('server')
      setError(loginErrorLabel('network_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${LOGIN_PANEL}`}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={panelScreen}
    >
      <div className="pointer-events-none absolute inset-0">
        <DotGridBackground active />
      </div>

      <div className={LOGIN_SHELL}>
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE } }}
        >
          <Card variant="chrome" className={LOGIN_CARD}>
            <div className="mb-8">
              {logoSvg && (
                <div
                  className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-full [&_svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: logoSvg }}
                  aria-hidden
                />
              )}
              {config?.name && <p className={LOGIN_BRAND_NAME}>{config.name}</p>}
              {config?.headline && <p className={LOGIN_HEADLINE}>{config.headline}</p>}
            </div>

            <form
              className="no-drag"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
            >
              <FieldSet className={LOGIN_FIELD_SET}>
                <FieldLegend className="sr-only">Connexion</FieldLegend>
                <FieldGroup className={LOGIN_FIELD_GROUP}>
                  <Field className={LOGIN_FIELD_STACK}>
                    <FieldLabel htmlFor={urlId} className={SETTINGS_FIELD_LABEL}>
                      Adresse du serveur
                    </FieldLabel>
                    <Input
                      id={urlId}
                      variant="desk"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onBlur={() => void handleUrlBlur()}
                      placeholder="https://exemple.pierre-ia.org"
                      autoComplete="url"
                      aria-invalid={connectionFieldInvalid('url', error, errorKind)}
                    />
                  </Field>

                  <Field className={LOGIN_FIELD_STACK}>
                    <FieldLabel htmlFor={emailId} className={SETTINGS_FIELD_LABEL}>
                      Email professionnel
                    </FieldLabel>
                    <Input
                      id={emailId}
                      variant="desk"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoComplete="username"
                      aria-invalid={connectionFieldInvalid('email', error, errorKind)}
                    />
                  </Field>

                  <Field className={LOGIN_FIELD_STACK}>
                    <FieldLabel htmlFor={passwordId} className={SETTINGS_FIELD_LABEL}>
                      Mot de passe
                    </FieldLabel>
                    <InputGroup className={deskControlVariants({ variant: 'desk' })}>
                      <InputGroupInput
                        id={passwordId}
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        aria-invalid={connectionFieldInvalid('password', error, errorKind)}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={
                            showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                          }
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

                  <Field orientation="horizontal" className="items-start gap-2.5">
                    <Checkbox
                      id={charterId}
                      checked={charterAccepted}
                      onCheckedChange={(checked) => setCharterAccepted(checked === true)}
                    />
                    <FieldLabel htmlFor={charterId} className={LOGIN_LEGAL_LABEL}>
                      J'ai pris connaissance et j'accepte la charte et/ou les consignes IA de mon
                      organisme.
                    </FieldLabel>
                  </Field>

                  <Field orientation="horizontal" className="items-start gap-2.5">
                    <Checkbox
                      id={aiDisclaimerId}
                      checked={aiDisclaimerAccepted}
                      onCheckedChange={(checked) => setAiDisclaimerAccepted(checked === true)}
                    />
                    <FieldLabel htmlFor={aiDisclaimerId} className={LOGIN_LEGAL_LABEL}>
                      Je reconnais que les réponses de {config?.name?.trim() || "L'agent"} peuvent
                      contenir des erreurs et m’engage à vérifier toute information importante avant
                      utilisation.
                    </FieldLabel>
                  </Field>
                </FieldGroup>

                <Button
                  type="submit"
                  disabled={loading || !charterAccepted || !aiDisclaimerAccepted}
                  className="w-full"
                >
                  {loading ? 'Connexion…' : 'Se connecter →'}
                </Button>
              </FieldSet>
            </form>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
