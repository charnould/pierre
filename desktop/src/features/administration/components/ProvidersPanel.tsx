import { Copy } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
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
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { toast } from '@/shared/components/ui/toast'

const OPENAI_URL = 'https://api.openai.com/v1'
const ANTHROPIC_URL = 'https://api.anthropic.com'

type AiKind = 'openai' | 'anthropic' | 'custom'
type AiType = 'openai' | 'anthropic'

type ProvidersView = {
  ai: { configured: boolean; type: string; baseUrl: string }
  rcs: { configured: boolean; from: string }
  email: { configured: boolean; domain: string }
  webhooks: { rcs: string; email: string }
}

const KINDS: SelectOption<AiKind>[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom', label: 'Autre' }
]

const PROTOCOLS: SelectOption<AiType>[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' }
]

function desktopApi() {
  if (typeof window === 'undefined') return undefined
  return window.api
}

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: 'Copié', type: 'success' })
  } catch {
    toast.add({ title: 'Copie impossible', type: 'error' })
  }
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput readOnly value={value} aria-label={label} />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-xs"
            aria-label={`Copier ${label}`}
            disabled={!value}
            onClick={() => void copy(value)}
          >
            <Copy />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

export function ProvidersPanel({ url }: { url: string }) {
  const fieldId = useId()
  const [view, setView] = useState<ProvidersView | null>(null)
  const [kind, setKind] = useState<AiKind>('openai')
  const [aiType, setAiType] = useState<AiType>('openai')
  const [aiBaseUrl, setAiBaseUrl] = useState(OPENAI_URL)
  const [aiApiKey, setAiApiKey] = useState('')
  const [rcsToken, setRcsToken] = useState('')
  const [rcsFrom, setRcsFrom] = useState('')
  const [rcsSecret, setRcsSecret] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [emailToken, setEmailToken] = useState('')
  const [emailAccount, setEmailAccount] = useState('')
  const [emailSecret, setEmailSecret] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    void desktopApi()
      ?.getAdminProviders?.({ url })
      .then((response) => {
        if (!response?.data) return
        const next = response.data
        setView(next)
        if (next.ai.type === 'anthropic' && next.ai.baseUrl === ANTHROPIC_URL) {
          setKind('anthropic')
          setAiType('anthropic')
          setAiBaseUrl(ANTHROPIC_URL)
        } else if (next.ai.type === 'openai' && next.ai.baseUrl === OPENAI_URL) {
          setKind('openai')
          setAiType('openai')
          setAiBaseUrl(OPENAI_URL)
        } else if (
          next.ai.configured &&
          (next.ai.type === 'openai' || next.ai.type === 'anthropic')
        ) {
          setKind('custom')
          setAiType(next.ai.type)
          setAiBaseUrl(next.ai.baseUrl)
        }
        if (next.rcs.from) setRcsFrom(next.rcs.from)
      })
  }, [url])

  function applyKind(next: AiKind) {
    setKind(next)
    if (next === 'openai') {
      setAiType('openai')
      setAiBaseUrl(OPENAI_URL)
    } else if (next === 'anthropic') {
      setAiType('anthropic')
      setAiBaseUrl(ANTHROPIC_URL)
    } else {
      setAiBaseUrl('')
    }
  }

  async function save(body: Record<string, unknown>, empty: () => void) {
    setPending(true)
    setError('')
    const response = await desktopApi()?.putAdminProviders?.({ url, body })
    setPending(false)
    if (!response || response.error) {
      setError(response?.error?.message ?? 'Enregistrement impossible')
      return
    }
    if (response.data?.rcsSecret) setRcsSecret(response.data.rcsSecret)
    empty()
    toast.add({ title: 'Enregistré', type: 'success' })
    const fresh = await desktopApi()?.getAdminProviders?.({ url })
    if (fresh?.data) setView(fresh.data)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-auto px-4 py-4">
      <FieldSet>
        <FieldLegend>
          Changer ces valeurs envoie les conversations et les messages des locataires chez le
          prestataire indiqué.
        </FieldLegend>
        <FieldDescription>
          L’ancienne valeur n’est jamais réaffichée. Une conversation déjà ouverte garde l’ancienne
          clé jusqu’à sa fin.
        </FieldDescription>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Intelligence</FieldLegend>
        <FieldDescription>
          {view?.ai.configured ? 'Branchée.' : 'Non branchée.'} Recollez la clé à chaque
          enregistrement.
        </FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-kind`}>Prestataire</FieldLabel>
            <Select
              items={KINDS}
              value={kind}
              onValueChange={(next) => {
                if (next === 'openai' || next === 'anthropic' || next === 'custom') applyKind(next)
              }}
            >
              <SelectTrigger id={`${fieldId}-kind`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItems items={KINDS} />
              </SelectContent>
            </Select>
          </Field>
          {kind === 'custom' ? (
            <Field>
              <FieldLabel htmlFor={`${fieldId}-protocol`}>Protocole</FieldLabel>
              <Select
                items={PROTOCOLS}
                value={aiType}
                onValueChange={(next) => {
                  if (next === 'openai' || next === 'anthropic') setAiType(next)
                }}
              >
                <SelectTrigger id={`${fieldId}-protocol`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItems items={PROTOCOLS} />
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor={`${fieldId}-url`}>Adresse</FieldLabel>
            <Input
              id={`${fieldId}-url`}
              value={aiBaseUrl}
              spellCheck={false}
              onChange={(event) => setAiBaseUrl(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-key`}>Clé</FieldLabel>
            <Input
              id={`${fieldId}-key`}
              type="password"
              value={aiApiKey}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setAiApiKey(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              void save({ group: 'ai', aiType, aiBaseUrl, aiApiKey }, () => setAiApiKey(''))
            }
          >
            Enregistrer
          </Button>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Canaux</FieldLegend>
        <FieldDescription>
          RCS {view?.rcs.configured ? 'enregistré' : 'non paramétré'}. Email{' '}
          {view?.email.configured ? 'enregistré' : 'non paramétré'}.
        </FieldDescription>
        <FieldGroup>
          <CopyField label="Webhook RCS" value={view?.webhooks.rcs ?? ''} />
          <CopyField label="Webhook email" value={view?.webhooks.email ?? ''} />
          <Field>
            <FieldLabel htmlFor={`${fieldId}-rcs-token`}>Jeton RCS</FieldLabel>
            <Input
              id={`${fieldId}-rcs-token`}
              value={rcsToken}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setRcsToken(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-rcs-from`}>Nom d’expéditeur RCS</FieldLabel>
            <Input
              id={`${fieldId}-rcs-from`}
              value={rcsFrom}
              spellCheck={false}
              onChange={(event) => setRcsFrom(event.target.value)}
            />
          </Field>
          {rcsSecret ? (
            <CopyField label="Secret RCS à recopier dans CM.com" value={rcsSecret} />
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => void save({ group: 'rcs', rcsToken, rcsFrom }, () => setRcsToken(''))}
            >
              Enregistrer le RCS
            </Button>
            {view?.rcs.configured ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void save({ group: 'rcs', regenerateSecret: true }, () => undefined)}
              >
                Nouveau secret
              </Button>
            ) : null}
          </div>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-email-domain`}>Domaine email</FieldLabel>
            <Input
              id={`${fieldId}-email-domain`}
              value={emailDomain}
              spellCheck={false}
              onChange={(event) => setEmailDomain(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-email-token`}>Jeton email</FieldLabel>
            <Input
              id={`${fieldId}-email-token`}
              value={emailToken}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setEmailToken(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-email-account`}>Identifiant de compte</FieldLabel>
            <Input
              id={`${fieldId}-email-account`}
              value={emailAccount}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setEmailAccount(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-email-secret`}>Secret du webhook email</FieldLabel>
            <Input
              id={`${fieldId}-email-secret`}
              type="password"
              value={emailSecret}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setEmailSecret(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              void save(
                { group: 'email', emailDomain, emailToken, emailAccount, emailSecret },
                () => {
                  setEmailToken('')
                  setEmailAccount('')
                  setEmailSecret('')
                }
              )
            }
          >
            Enregistrer l’email
          </Button>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>
      </FieldSet>
    </div>
  )
}
