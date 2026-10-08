import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyholeOpen,
  MailCheck,
  ServerNas,
  ShieldCheck,
  SquareCheck
} from 'lucide-react'
import { useId, useState } from 'react'

import { loginWithTypedCredentials } from '@/features/auth'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Field,
  FieldContent,
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
  type LoginField,
  type LoginFieldErrors,
  loginFieldErrorsFromCode,
  validateLoginFields
} from '@/shared/lib/login-errors'
import { warnRenderer } from '@/shared/lib/renderer-log'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

const LOGIN_LEGAL_REQUIRED = 'Acceptez les conditions pour continuer.'

interface Props {
  settings: Settings
  onLogin: (s: Settings, meta: { user: UserPrincipal }) => void
}

export function LoginPanel({ settings, onLogin }: Props) {
  const [url, setUrl] = useState(settings.url ?? '')
  const [email, setEmail] = useState(settings.email ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [conditionsAccepted, setConditionsAccepted] = useState(false)
  const [legalError, setLegalError] = useState('')
  const [appliedSettings, setAppliedSettings] = useState(settings)
  const urlId = useId()
  const emailId = useId()
  const passwordId = useId()
  const urlErrorId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()
  const conditionsId = useId()
  const legalErrorId = useId()

  if (appliedSettings !== settings) {
    setAppliedSettings(settings)
    setUrl(settings.url ?? '')
    setEmail(settings.email ?? '')
    setPassword('')
  }

  function clearFieldError(field: LoginField) {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit() {
    const validation = validateLoginFields({ url, email, password })
    const legalOk = conditionsAccepted
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
      email: email.trim()
    }

    try {
      const result = await loginWithTypedCredentials({ ...next, password })
      if (result.ok) {
        await window.api.saveSettings(next)
        onLogin(next, { user: result.user })
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
    <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden">
      <form
        className="flex w-full flex-col gap-4 overflow-hidden px-6 py-6"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <h1 className="sr-only">Connexion</h1>
        <div
          data-slot="login-mark"
          aria-hidden
          className="text-foreground flex w-full items-center justify-between"
        >
          <ServerNas className="size-8" strokeWidth={1.5} />
          <span className="text-2xl leading-none">×</span>
          <MailCheck className="size-8" strokeWidth={1.5} />
          <span className="text-2xl leading-none">×</span>
          <KeyRound className="size-8" strokeWidth={1.5} />
          <span className="text-2xl leading-none">×</span>
          <SquareCheck className="size-8" strokeWidth={1.5} />
          <span className="text-2xl leading-none">=</span>
          <LockKeyholeOpen className="size-8" strokeWidth={1.5} />
          <span className="text-2xl leading-none">×</span>
          <ShieldCheck className="size-8" strokeWidth={1.5} />
        </div>

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
              placeholder="https://pierre.parishabitat.fr"
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
              placeholder="jules.siegfried@parishabitat.fr"
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

        <FieldGroup aria-describedby={legalError ? legalErrorId : undefined}>
          <Field orientation="horizontal">
            <Checkbox
              id={conditionsId}
              checked={conditionsAccepted}
              onCheckedChange={(checked) => {
                setConditionsAccepted(checked === true)
                setLegalError('')
              }}
            />
            <FieldContent>
              <FieldLabel htmlFor={conditionsId}>J'accepte les conditions d'utilisation</FieldLabel>
              <FieldDescription className="[font-size:12px] leading-4">
                Je confirme avoir pris connaissance et accepter la charte ou les consignes
                d’utilisation de l’IA de mon organisme.
              </FieldDescription>
              <FieldDescription className="[font-size:12px] leading-4">
                Je reconnais que les réponses générées par l'IA peuvent contenir des erreurs, des
                omissions ou des informations inexactes. Je m’engage à vérifier leur exactitude et
                leur pertinence avant toute utilisation ou transmission.{' '}
              </FieldDescription>
            </FieldContent>
          </Field>
          {legalError ? <FieldError id={legalErrorId}>{legalError}</FieldError> : null}
        </FieldGroup>

        <Button type="submit" className="w-fit" disabled={loading} aria-busy={loading}>
          {loading ? <Spinner data-icon="inline-start" aria-hidden /> : null}
          Se connecter
        </Button>
      </form>
    </div>
  )
}
