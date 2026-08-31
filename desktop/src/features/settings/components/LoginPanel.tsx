import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

import { loginWithTypedCredentials } from '@/features/auth/credentials'
import { panelScreen } from '@/features/workflow/components/WorkflowPanelChrome'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/shared/components/ui/input-group'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  connectionFieldInvalid,
  loginFieldErrorsFromCode,
  validateLoginFields,
  type LoginField,
  type LoginFieldErrors
} from '@/shared/lib/login-errors'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { Settings } from '@/shared/types'

import { fetchConfig, type DesktopConfig } from '../settings-config'
import { LoginMark } from './LoginMark'

const LOGIN_LEGAL_REQUIRED = 'Acceptez les deux conditions pour continuer.'

interface Props {
  settings: Settings
  onLogin: (s: Settings, meta?: { agentName?: string }) => void
}

export function LoginPanel({ settings, onLogin }: Props) {
  const [url, setUrl] = useState(settings.url ?? '')
  const [email, setEmail] = useState(settings.email ?? '')
  const [password, setPassword] = useState(settings.loggedOut ? '' : (settings.password ?? ''))
  const [showPw, setShowPw] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<DesktopConfig | null>(null)
  const [charterAccepted, setCharterAccepted] = useState(false)
  const [aiDisclaimerAccepted, setAiDisclaimerAccepted] = useState(false)
  const [legalError, setLegalError] = useState('')
  const [appliedSettings, setAppliedSettings] = useState(settings)
  const urlId = useId()
  const emailId = useId()
  const passwordId = useId()
  const urlErrorId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()
  const charterId = useId()
  const aiDisclaimerId = useId()
  const legalErrorId = useId()

  useEffect(() => {
    if (!settings.url) return
    void fetchConfig(settings.url).then(setConfig)
  }, [settings.url])

  if (appliedSettings !== settings) {
    setAppliedSettings(settings)
    setUrl(settings.url ?? '')
    setEmail(settings.email ?? '')
    if (!settings.loggedOut) setPassword(settings.password ?? '')
  }

  function clearFieldError(field: LoginField) {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleUrlBlur() {
    let baseUrl: string
    try {
      baseUrl = new URL(url.trim()).origin
    } catch {
      setConfig(null)
      setCharterAccepted(false)
      setAiDisclaimerAccepted(false)
      setLegalError('')
      return
    }
    const nextConfig = await fetchConfig(baseUrl)
    setConfig(nextConfig)
    setCharterAccepted(false)
    setAiDisclaimerAccepted(false)
    setLegalError('')
  }

  async function handleSubmit() {
    const validation = validateLoginFields({ url, email, password })
    const legalOk = charterAccepted && aiDisclaimerAccepted
    if (Object.keys(validation).length > 0 || !legalOk) {
      setFieldErrors(validation)
      setLegalError(legalOk ? '' : LOGIN_LEGAL_REQUIRED)
      return
    }

    setFieldErrors({})
    setLegalError('')
    setLoading(true)
    const next: Settings = {
      url: new URL(url.trim()).origin,
      email: email.trim(),
      password: password.trim(),
      loggedOut: false
    }

    try {
      const result = await loginWithTypedCredentials(next)
      if (result.ok) {
        await window.api.saveSettings(next)
        onLogin(next, { agentName: config?.name })
      } else {
        setFieldErrors(loginFieldErrorsFromCode(result.message))
      }
    } catch (err) {
      warnRenderer('LoginPanel.handleSubmit', err)
      setFieldErrors(loginFieldErrorsFromCode('network_error'))
    } finally {
      setLoading(false)
    }
  }

  const urlInvalid = connectionFieldInvalid('url', fieldErrors)
  const emailInvalid = connectionFieldInvalid('email', fieldErrors)
  const passwordInvalid = connectionFieldInvalid('password', fieldErrors)

  return (
    <motion.div
      className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={panelScreen}
    >
      <form
        className="flex w-full flex-col gap-4 overflow-hidden px-6 py-6"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <h1 className="sr-only">Connexion</h1>
        <LoginMark />

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={urlId}>Serveur</FieldLabel>
            <Input
              id={urlId}
              aria-label="Serveur"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                clearFieldError('url')
              }}
              onBlur={() => void handleUrlBlur()}
              placeholder="https://exemple.pierre-ia.org"
              autoComplete="url"
              aria-invalid={urlInvalid}
              aria-describedby={urlInvalid ? urlErrorId : undefined}
              aria-errormessage={urlInvalid ? urlErrorId : undefined}
            />
            {fieldErrors.url ? <FieldError id={urlErrorId}>{fieldErrors.url}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={emailId}>Email</FieldLabel>
            <Input
              id={emailId}
              aria-label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearFieldError('email')
              }}
              placeholder="votre@email.com"
              autoComplete="email"
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? emailErrorId : undefined}
              aria-errormessage={emailInvalid ? emailErrorId : undefined}
            />
            {fieldErrors.email ? (
              <FieldError id={emailErrorId}>{fieldErrors.email}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={passwordId}>Mot de passe</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={passwordId}
                aria-label="Mot de passe"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearFieldError('password')
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={passwordInvalid}
                aria-describedby={passwordInvalid ? passwordErrorId : undefined}
                aria-errormessage={passwordInvalid ? passwordErrorId : undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {fieldErrors.password ? (
              <FieldError id={passwordErrorId}>{fieldErrors.password}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>

        <FieldGroup className="gap-2" aria-describedby={legalError ? legalErrorId : undefined}>
          <Field orientation="horizontal" className="items-start">
            <Checkbox
              id={charterId}
              checked={charterAccepted}
              onCheckedChange={(checked) => {
                setCharterAccepted(checked === true)
                setLegalError('')
              }}
            />
            <FieldLabel htmlFor={charterId} className="min-w-0">
              <FieldDescription>
                J’ai pris connaissance et j’accepte la charte et/ou les consignes IA de mon
                organisme.
              </FieldDescription>
            </FieldLabel>
          </Field>

          <Field orientation="horizontal" className="items-start">
            <Checkbox
              id={aiDisclaimerId}
              checked={aiDisclaimerAccepted}
              onCheckedChange={(checked) => {
                setAiDisclaimerAccepted(checked === true)
                setLegalError('')
              }}
            />
            <FieldLabel htmlFor={aiDisclaimerId} className="min-w-0">
              <FieldDescription>
                Je reconnais que les réponses générées par IA peuvent contenir des erreurs et
                m’engage à vérifier toute information importante avant utilisation.
              </FieldDescription>
            </FieldLabel>
          </Field>
          {legalError ? <FieldError id={legalErrorId}>{legalError}</FieldError> : null}
        </FieldGroup>

        <Button type="submit" className="w-fit" disabled={loading} aria-busy={loading}>
          {loading ? <Spinner data-icon="inline-start" aria-hidden /> : null}
          Se connecter
        </Button>
      </form>
    </motion.div>
  )
}
