import { ArrowLeft, CircleCheck, Copy, RefreshCw, Send } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
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
import { Kbd } from '@/shared/components/ui/kbd'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { ActivityContext, ActivityListItem } from '@/shared/types/activites'

type LlmType = 'anthropic' | 'openai' | 'openai-compatible'

const ANTHROPIC_URL = 'https://api.anthropic.com'
const OPENAI_URL = 'https://api.openai.com/v1'
const SUGGESTED_MODEL = 'claude-sonnet-5-5'
const SUGGESTED_EFFORT = 'medium'
const TYPES: SelectOption<LlmType>[] = [
  { value: 'anthropic', label: 'Anthropic', description: ANTHROPIC_URL },
  { value: 'openai', label: 'OpenAI', description: OPENAI_URL },
  {
    value: 'openai-compatible',
    label: 'OpenAI-compatible',
    description: 'https://api.mistral.ai/v1'
  }
]

function proposeSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const RCS_TEST_TEXT = 'Avez-vous bien reçu ce RCS ?'
const RCS_SEND_CONTEXTS = ['tickets', 'repayment', 'automations', 'bulk'] as const

function rcsSendContext(moduleIds: readonly string[]): ActivityContext | null {
  return RCS_SEND_CONTEXTS.find((id) => moduleIds.includes(id)) ?? null
}

function channelLine(items: ActivityListItem[], channel: 'rcs' | 'sms'): string | null {
  const sent = items.some((item) => item.type === 'communication.sent' && item.channel === channel)
  if (!sent) return null
  const name = channel === 'rcs' ? 'RCS' : 'SMS'
  if (items.some((item) => item.type === 'communication.ok' && item.channel === channel)) {
    return `${name} envoyé, webhook ok`
  }
  if (items.some((item) => item.type === 'communication.failed' && item.channel === channel)) {
    return `${name} envoyé, webhook échec`
  }
  return `${name} envoyé`
}

function rcsReply(items: ActivityListItem[]): 'Oui' | 'Non' | null {
  for (const item of items) {
    if (item.type !== 'communication.received') continue
    if (item.contenu.includes('« Oui »')) return 'Oui'
    if (item.contenu.includes('« Non »')) return 'Non'
  }
  return null
}

function rcsTestReport(items: ActivityListItem[]): { text: string; done: boolean } {
  const reply = rcsReply(items)
  const lines = [channelLine(items, 'rcs'), channelLine(items, 'sms')]
  if (reply) lines.push(`Réponse : ${reply}`)
  return { text: lines.filter((line) => line != null).join(' · '), done: reply != null }
}

function isLlmType(value: string): value is LlmType {
  return value === 'anthropic' || value === 'openai' || value === 'openai-compatible'
}

function defaultUrl(type: LlmType): string {
  if (type === 'anthropic') return ANTHROPIC_URL
  if (type === 'openai') return OPENAI_URL
  return ''
}

function saved(current: string, stored: string | undefined): boolean {
  return Boolean(stored) && current === stored
}

function isPng(file: File): boolean {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
}

const EMAIL_FIELDS = ['logo_inline_cid', 'message'] as const

type ProvidersView = {
  ai: { configured: boolean; type: string; baseUrl: string; model: string; effort: string }
  rcs: { configured: boolean; from: string; secret: string }
  email: { configured: boolean; domain: string; account: string }
  webhooks: { rcs: string; email: string }
}

function desktopApi() {
  if (typeof window === 'undefined') return undefined
  return window.api
}

function Section({
  id,
  title,
  mark,
  children
}: {
  id: string
  title: string
  mark?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle id={id}>{title}</CardTitle>
            {mark ? (
              <CircleCheck
                aria-label={mark}
                className="text-primary size-4 shrink-0"
                strokeWidth={1.5}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">{children}</div>
        </CardContent>
      </Card>
    </section>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <FieldGroup variant="rows">{children}</FieldGroup>
}

function Row({
  title,
  description,
  htmlFor,
  children
}: {
  title: string
  description?: ReactNode
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={htmlFor}>{title}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      {children}
    </Field>
  )
}

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: 'Copié', type: 'success' })
  } catch {
    toast.add({ title: 'Copie impossible', type: 'error' })
  }
}

function CopyField({
  label,
  value,
  description
}: {
  label: string
  value: string
  description?: string
}) {
  return (
    <Row title={label} description={description}>
      <InputGroup>
        <InputGroupInput
          className="py-0 font-mono leading-8"
          readOnly
          value={value}
          aria-label={label}
        />
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
    </Row>
  )
}

function MarkedInput({
  id,
  value,
  onChange,
  marked,
  secret = false
}: {
  id: string
  value: string
  onChange: (value: string) => void
  marked: boolean
  secret?: boolean
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        className="py-0 font-mono leading-8"
        type={secret ? 'password' : 'text'}
        value={value}
        placeholder={secret && marked ? '••••••••' : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {marked ? (
        <InputGroupAddon align="inline-end">
          <CircleCheck aria-hidden className="size-4" strokeWidth={1.5} />
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}

export function ProvidersPanel({
  url,
  moduleIds,
  onBack
}: {
  url: string
  moduleIds: readonly string[]
  onBack: () => void
}) {
  const fieldId = useId()
  const [view, setView] = useState<ProvidersView | null>(null)
  const [orgName, setOrgName] = useState('PIERRE')
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [llmType, setLlmType] = useState<LlmType>('anthropic')
  const [llmBaseUrl, setLlmBaseUrl] = useState(ANTHROPIC_URL)
  const [llmModel, setLlmModel] = useState(SUGGESTED_MODEL)
  const [llmEffort, setLlmEffort] = useState(SUGGESTED_EFFORT)
  const [llmApiKey, setLlmApiKey] = useState('')
  const [rcsToken, setRcsToken] = useState('')
  const [rcsFrom, setRcsFrom] = useState('')
  const [rcsSecret, setRcsSecret] = useState(proposeSecret)
  const [emailDomain, setEmailDomain] = useState('')
  const [emailToken, setEmailToken] = useState('')
  const [emailAccount, setEmailAccount] = useState('')
  const [emailSecret, setEmailSecret] = useState('')
  const [emailHtml, setEmailHtml] = useState('')
  const [logoStored, setLogoStored] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingRcsTest, setSendingRcsTest] = useState(false)
  const [rcsTestPhone, setRcsTestPhone] = useState('')
  const [rcsTestStatus, setRcsTestStatus] = useState('')
  const rcsPoll = useRef(0)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState({
    organism: 'Aucune modification',
    ai: 'Aucune modification',
    rcs: 'Aucune modification',
    email: 'Aucune modification'
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [providers, setup] = await Promise.all([
        desktopApi()?.getAdminProviders?.({ url }),
        desktopApi()?.getAdminSetup?.({ url })
      ])
      if (cancelled) return
      if (providers?.data) applyView(providers.data)
      if (setup) {
        setEmailHtml(setup.texts['email/html'] ?? '')
        setLogoStored(setup.binaries.includes('email/logo.png'))
      }
      const raw = setup?.texts?.global
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as { name?: unknown; timezone?: unknown }
        if (typeof parsed.name === 'string' && parsed.name.trim()) setOrgName(parsed.name)
        if (typeof parsed.timezone === 'string' && parsed.timezone.trim()) {
          setTimezone(parsed.timezone)
        }
      } catch {
        return
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const read = desktopApi()?.getSetupFile
    if (!logoStored || !read) return
    let active = true
    let objectUrl: string | null = null
    void read({ url, id: 'email/logo.png' }).then((buffer) => {
      if (!active || !buffer) return
      objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }))
      setLogoUrl(objectUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [logoStored, url])

  function touch(target: keyof typeof status) {
    setStatus((current) => ({ ...current, [target]: 'Modifications à enregistrer' }))
  }

  function applyType(next: LlmType) {
    setLlmType(next)
    setLlmBaseUrl(defaultUrl(next))
    touch('ai')
  }

  function applyView(next: ProvidersView) {
    const type = isLlmType(next.ai.type) ? next.ai.type : 'anthropic'
    setView(next)
    setLlmType(type)
    setLlmBaseUrl(next.ai.baseUrl || defaultUrl(type))
    setLlmModel(next.ai.model || SUGGESTED_MODEL)
    setLlmEffort(next.ai.effort || SUGGESTED_EFFORT)
    setRcsFrom(next.rcs.from)
    setRcsSecret((current) => next.rcs.secret || current)
    setEmailDomain(next.email.domain)
    setEmailAccount(next.email.account)
  }

  async function reload() {
    const fresh = await desktopApi()?.getAdminProviders?.({ url })
    if (fresh?.data) applyView(fresh.data)
  }

  async function saveOrganism() {
    setPending(true)
    const setup = await desktopApi()?.putAdminSetup?.({
      url,
      id: 'global',
      body: JSON.stringify({ name: orgName.trim(), timezone: timezone.trim() })
    })
    setPending(false)
    if (!setup || setup.error) {
      setStatus((current) => ({
        ...current,
        organism: setup?.error?.message ?? 'Enregistrement impossible'
      }))
      return
    }
    setStatus((current) => ({ ...current, organism: 'Enregistré' }))
    toast.add({ title: 'Enregistré', type: 'success' })
  }

  async function saveAi() {
    setPending(true)
    const ai = await desktopApi()?.putAdminProviders?.({
      url,
      body: { group: 'ai', llmType, llmBaseUrl, llmApiKey, llmModel, llmEffort }
    })
    if (!ai || ai.error) {
      setPending(false)
      setStatus((current) => ({
        ...current,
        ai: ai?.error?.message ?? 'Enregistrement impossible'
      }))
      return
    }
    setLlmApiKey('')
    await reload()
    setPending(false)
    setStatus((current) => ({ ...current, ai: 'Enregistré' }))
    toast.add({ title: 'Enregistré', type: 'success' })
  }

  async function saveRcs() {
    setPending(true)
    const rcs = await desktopApi()?.putAdminProviders?.({
      url,
      body: { group: 'rcs', rcsToken, rcsFrom, rcsSecret }
    })
    if (!rcs || rcs.error) {
      setPending(false)
      setStatus((current) => ({
        ...current,
        rcs: rcs?.error?.message ?? 'Enregistrement impossible'
      }))
      return
    }
    if (rcs.data?.rcsSecret) setRcsSecret(rcs.data.rcsSecret)
    setRcsToken('')
    await reload()
    setPending(false)
    setStatus((current) => ({ ...current, rcs: 'Enregistré' }))
    toast.add({ title: 'Enregistré', type: 'success' })
  }

  async function saveEmail() {
    setPending(true)
    const html = await desktopApi()?.putAdminSetup?.({
      url,
      id: 'email/html',
      body: emailHtml
    })
    if (!html || html.error) {
      setPending(false)
      setStatus((current) => ({
        ...current,
        email: html?.error?.message ?? 'Enregistrement impossible'
      }))
      return
    }
    if (emailDomain && emailAccount && (view?.email.configured || (emailToken && emailSecret))) {
      const email = await desktopApi()?.putAdminProviders?.({
        url,
        body: { group: 'email', emailDomain, emailToken, emailAccount, emailSecret }
      })
      if (!email || email.error) {
        setPending(false)
        setStatus((current) => ({
          ...current,
          email: email?.error?.message ?? 'Enregistrement impossible'
        }))
        return
      }
      setEmailToken('')
      setEmailSecret('')
    }
    await reload()
    setPending(false)
    setStatus((current) => ({ ...current, email: 'Enregistré' }))
    toast.add({ title: 'Enregistré', type: 'success' })
  }

  function saveBar(target: keyof typeof status, onSave: () => void) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || view === null}
          onClick={onSave}
        >
          Enregistrer
        </Button>
        <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
          {status[target]}
        </p>
      </div>
    )
  }

  async function uploadLogo(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const response = await desktopApi()?.putAdminSetup?.({ url, id: 'email/logo.png', bytes })
    if (!response?.data) {
      setStatus((current) => ({
        ...current,
        email: response?.error?.message ?? 'Téléversement refusé'
      }))
      return
    }
    setLogoStored(true)
    setLogoUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
    })
    toast.add({ title: 'Téléversé', type: 'success' })
  }

  useEffect(
    () => () => {
      rcsPoll.current += 1
    },
    []
  )

  async function sendRcsTest() {
    const contexte = rcsSendContext(moduleIds)
    if (!contexte) return
    const generation = ++rcsPoll.current
    const ref = `rcs-test-${crypto.randomUUID()}`
    setSendingRcsTest(true)
    setRcsTestStatus('')
    const response = await desktopApi()?.sendCommunication?.({
      url,
      idempotencyKey: crypto.randomUUID(),
      channel: 'rcs',
      contexte,
      ref,
      destinataire: rcsTestPhone.trim(),
      contenu: {
        body: RCS_TEST_TEXT,
        sms_fallback: RCS_TEST_TEXT,
        choices: [
          { type: 'reply', label: 'Oui' },
          { type: 'reply', label: 'Non' }
        ]
      }
    })
    if (generation !== rcsPoll.current) return
    if (!response || 'error' in response) {
      setSendingRcsTest(false)
      setRcsTestStatus(response?.error.message ?? 'Envoi impossible')
      return
    }
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (generation !== rcsPoll.current) return
      const listed = await desktopApi()?.getActivities?.({ url, contexte, ref, limit: 20 })
      const report = rcsTestReport(listed?.data ?? [])
      setRcsTestStatus(report.text || 'RCS envoyé')
      if (report.done) {
        setSendingRcsTest(false)
        return
      }
    }
    if (generation !== rcsPoll.current) return
    setSendingRcsTest(false)
    setRcsTestStatus((current) =>
      current ? `${current} · Aucune réponse reçue` : 'Aucune réponse reçue'
    )
  }

  async function sendTestEmail() {
    setSendingTest(true)
    const response = await desktopApi()?.postEmailTest?.({ url })
    setSendingTest(false)
    if (!response || response.error) {
      setStatus((current) => ({
        ...current,
        email: response?.error?.message ?? 'Envoi impossible'
      }))
      return
    }
    toast.add({ title: 'Email de test envoyé', type: 'success' })
  }

  const emailTestReady =
    EMAIL_FIELDS.every((field) => emailHtml.includes(`{{ ${field} }}`)) && logoStored

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <main className="bg-background min-h-full px-4 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Retour"
              onClick={onBack}
            >
              <ArrowLeft />
            </Button>
            <h1 className="font-serif text-4xl leading-tight font-normal">
              Paramètres généraux + Services
            </h1>
          </div>
          <Section id="organisme" title="Organisme">
            <Rows>
              <Row
                title="Nom de l’agent"
                description={
                  <>
                    Nom de l'agent à travers l'ensemble de l’application. On sollicite son
                    intervention ou son aide dans un dossier, ou sur un sujet, en saisissant{' '}
                    <Kbd>@{orgName.trim() || 'nom'}</Kbd> dans l'interface.
                  </>
                }
                htmlFor={`${fieldId}-name`}
              >
                <Input
                  id={`${fieldId}-name`}
                  className="py-0 font-mono leading-8"
                  value={orgName}
                  spellCheck={false}
                  onChange={(event) => {
                    setOrgName(event.target.value)
                    touch('organism')
                  }}
                />
              </Row>
              <Row
                title="Fuseau horaire"
                description={
                  <>
                    Fuseau horaire utilisé à travers l'ensemble de l’instance. Indiquer{' '}
                    <Kbd>Europe/Paris</Kbd> pour la métropole. Consulter{' '}
                    <a
                      href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
                      target="_blank"
                      rel="noreferrer"
                    >
                      la liste complète
                    </a>{' '}
                    pour d'autres localisations.
                  </>
                }
                htmlFor={`${fieldId}-zone`}
              >
                <Input
                  id={`${fieldId}-zone`}
                  className="py-0 font-mono leading-8"
                  value={timezone}
                  spellCheck={false}
                  onChange={(event) => {
                    setTimezone(event.target.value)
                    touch('organism')
                  }}
                />
              </Row>
            </Rows>
            {saveBar('organism', () => void saveOrganism())}
          </Section>

          <Section id="langage" title="Intelligence artificielle (LLM)">
            <Rows>
              <Row
                title="Type d'API utilisée"
                description="Quel est le format de l'API utilisée par votre fournisseur d'inférence : Anthropic, OpenAI, ou OpenAI-compatible (par exemple Mistral ou Azure) ?"
                htmlFor={`${fieldId}-kind`}
              >
                <Select
                  items={TYPES}
                  value={llmType}
                  onValueChange={(next) => {
                    if (next && isLlmType(next)) applyType(next)
                  }}
                >
                  <SelectTrigger id={`${fieldId}-kind`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItems items={TYPES} />
                  </SelectContent>
                </Select>
              </Row>
              <Row
                title="Modèle de langage"
                description={
                  <>
                    Nom exact du modèle de langage qui sera utilisé à travers l'ensemble de
                    l'application. Exemples et tarifications de modèles :{' '}
                    <a
                      href="https://platform.claude.com/docs/en/about-claude/pricing"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Anthropic
                    </a>
                    {', '}
                    <a
                      href="https://developers.openai.com/api/docs/pricing"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenAI
                    </a>
                    {', '}
                    <a
                      href="https://docs.mistral.ai/inference/pricing"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mistral
                    </a>
                    .
                  </>
                }
                htmlFor={`${fieldId}-model`}
              >
                <MarkedInput
                  id={`${fieldId}-model`}
                  value={llmModel}
                  marked={saved(llmModel, view?.ai.model)}
                  onChange={(value) => {
                    setLlmModel(value)
                    touch('ai')
                  }}
                />
              </Row>
              <Row
                title="Effort de raisonnement"
                description="Combien de temps le modèle de langage réfléchit-il avant de répondre à une question. Un effort de raisonnement plus important consomme davantage de tokens. Tous les modèles n’acceptent pas tous les niveaux. Se référer à la documentation de votre fournisseur d'inférence."
                htmlFor={`${fieldId}-effort`}
              >
                <MarkedInput
                  id={`${fieldId}-effort`}
                  value={llmEffort}
                  marked={saved(llmEffort, view?.ai.effort)}
                  onChange={(value) => {
                    setLlmEffort(value)
                    touch('ai')
                  }}
                />
              </Row>
              <Row
                title="Adresse de l’API"
                description="Point d’accès du fournisseur d'inférence. Pour Anthropic et OpenAI la complétion est automatique. Pour un autre fournsseur, se référer à sa documentation."
                htmlFor={`${fieldId}-url`}
              >
                <MarkedInput
                  id={`${fieldId}-url`}
                  value={llmBaseUrl}
                  marked={saved(llmBaseUrl, view?.ai.baseUrl)}
                  onChange={(value) => {
                    setLlmBaseUrl(value)
                    touch('ai')
                  }}
                />
              </Row>
              <Row
                title="Clé de l’API"
                description="Obtenir une clé d'API auprès de votre fournisseur d'inférence. Ne pas divulguer cette clé. Un champ vide conserve la clé déjà enregistrée."
                htmlFor={`${fieldId}-key`}
              >
                <MarkedInput
                  id={`${fieldId}-key`}
                  value={llmApiKey}
                  secret
                  marked={
                    view?.ai.configured === true &&
                    view.ai.type === llmType &&
                    view.ai.baseUrl === llmBaseUrl &&
                    llmApiKey === ''
                  }
                  onChange={(value) => {
                    setLlmApiKey(value)
                    touch('ai')
                  }}
                />
              </Row>
            </Rows>
            {saveBar('ai', () => void saveAi())}
          </Section>

          <Section
            id="rcs"
            title="RCS/SMS (via CM.com)"
            mark={view?.rcs.configured ? 'RCS paramétré' : undefined}
          >
            <Rows>
              <Row
                title="Expéditeur RCS/SMS"
                description="Nom de l'expéditeurqui s'affichera dans vos RCS/SMS adreessés aux locataires et candidats. Il s'agit du nom de votre organisme déclaré chez CM.com, pas celui de l’agent."
                htmlFor={`${fieldId}-rcs-from`}
              >
                <MarkedInput
                  id={`${fieldId}-rcs-from`}
                  value={rcsFrom}
                  marked={saved(rcsFrom, view?.rcs.from)}
                  onChange={(value) => {
                    setRcsFrom(value)
                    touch('rcs')
                  }}
                />
              </Row>
              <Row
                title="Product token"
                description="Identifiant disponible sous ce nom de « product token » dans l'interface d'administration de CM.com. Un champ vide conserve le token déjà enregistré."
                htmlFor={`${fieldId}-rcs-token`}
              >
                <MarkedInput
                  id={`${fieldId}-rcs-token`}
                  value={rcsToken}
                  secret
                  marked={view?.rcs.configured === true && rcsToken === ''}
                  onChange={(value) => {
                    setRcsToken(value)
                    touch('rcs')
                  }}
                />
              </Row>
              <CopyField
                label="Webhook RCS"
                description="Adresse que CM.com appelle quand un message RCS arrive. À coller dans leur console."
                value={view?.webhooks.rcs ?? ''}
              />
              <Row
                title="Secret à recopier dans CM.com"
                description="Affiché une seule fois. À recopier dans CM.com pour qu’il signe ses appels."
              >
                <InputGroup>
                  <InputGroupInput
                    className="py-0 font-mono leading-8"
                    readOnly
                    value={rcsSecret}
                    aria-label="Secret à recopier dans CM.com"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label="Copier Secret à recopier dans CM.com"
                      disabled={!rcsSecret}
                      onClick={() => void copy(rcsSecret)}
                    >
                      <Copy />
                    </InputGroupButton>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <InputGroupButton
                            type="button"
                            size="icon-xs"
                            aria-label="Nouveau secret"
                            disabled={pending}
                            onClick={() => {
                              setRcsSecret(proposeSecret())
                              touch('rcs')
                            }}
                          />
                        }
                      >
                        <RefreshCw />
                      </TooltipTrigger>
                      <TooltipContent>Nouveau secret</TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Row>
              <Row
                title="Test d'envoi RCS/SMS"
                description="Adresse un RCS/SMS au numéro de téléphone spécifié."
                htmlFor={`${fieldId}-rcs-test`}
              >
                <div className="flex flex-col gap-2">
                  <InputGroup>
                    <InputGroupInput
                      id={`${fieldId}-rcs-test`}
                      value={rcsTestPhone}
                      spellCheck={false}
                      onChange={(event) => setRcsTestPhone(event.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <InputGroupButton
                              type="button"
                              size="icon-xs"
                              aria-label="Envoyer"
                              disabled={
                                !view?.rcs.configured ||
                                !rcsSendContext(moduleIds) ||
                                !rcsTestPhone.trim() ||
                                sendingRcsTest ||
                                pending
                              }
                              onClick={() => void sendRcsTest()}
                            />
                          }
                        >
                          <Send />
                        </TooltipTrigger>
                        <TooltipContent>Envoyer</TooltipContent>
                      </Tooltip>
                    </InputGroupAddon>
                  </InputGroup>
                  {rcsTestStatus ? (
                    <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
                      {rcsTestStatus}
                    </p>
                  ) : null}
                </div>
              </Row>
            </Rows>
            {saveBar('rcs', () => void saveRcs())}
          </Section>

          <Section id="email" title="Email">
            <Rows>
              <Row
                title="Domaine d’envoi"
                description="Domaine des adresses depuis lesquelles partent les e-mails."
                htmlFor={`${fieldId}-email-domain`}
              >
                <MarkedInput
                  id={`${fieldId}-email-domain`}
                  value={emailDomain}
                  marked={saved(emailDomain, view?.email.domain)}
                  onChange={(value) => {
                    setEmailDomain(value)
                    touch('email')
                  }}
                />
              </Row>
              <Row
                title="Compte CM.com"
                description="Compte e-mail ouvert chez CM.com. L’identifiant est un UUID."
                htmlFor={`${fieldId}-email-account`}
              >
                <MarkedInput
                  id={`${fieldId}-email-account`}
                  value={emailAccount}
                  marked={saved(emailAccount, view?.email.account)}
                  onChange={(value) => {
                    setEmailAccount(value)
                    touch('email')
                  }}
                />
              </Row>
              <CopyField
                label="Webhook email"
                description="Adresse que CM.com appelle quand un e-mail arrive. À coller dans leur console."
                value={view?.webhooks.email ?? ''}
              />
              <Row
                title="Jeton produit"
                description="Jeton remis par CM.com pour le canal e-mail. Un champ vide conserve le jeton déjà enregistré."
                htmlFor={`${fieldId}-email-token`}
              >
                <MarkedInput
                  id={`${fieldId}-email-token`}
                  value={emailToken}
                  secret
                  marked={view?.email.configured === true && emailToken === ''}
                  onChange={(value) => {
                    setEmailToken(value)
                    touch('email')
                  }}
                />
              </Row>
              <Row
                title="Secret du webhook"
                description="Secret fourni par CM.com, pour vérifier que l’appel vient bien de chez eux. Un champ vide conserve le secret déjà enregistré."
                htmlFor={`${fieldId}-email-secret`}
              >
                <MarkedInput
                  id={`${fieldId}-email-secret`}
                  value={emailSecret}
                  secret
                  marked={view?.email.configured === true && emailSecret === ''}
                  onChange={(value) => {
                    setEmailSecret(value)
                    touch('email')
                  }}
                />
              </Row>
              <Row
                title="Logo"
                description="Image de l’organisme dans les e-mails. PNG transparent, bord à bord."
                htmlFor={`${fieldId}-logo`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo enregistré"
                      className="border-input bg-background h-8 w-auto max-w-48 shrink-0 rounded-md border object-contain p-0.5"
                    />
                  ) : null}
                  <Input
                    id={`${fieldId}-logo`}
                    type="file"
                    accept=".png"
                    className="min-w-0 flex-1"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      if (!isPng(file)) {
                        toast.add({ title: 'Le logo doit être un PNG', type: 'error' })
                        return
                      }
                      void uploadLogo(file)
                    }}
                  />
                </div>
              </Row>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-email-html`}>Gabarit</FieldLabel>
                <FieldDescription>
                  Mise en page des e-mails. {'{{ logo_inline_cid }}'} et {'{{ message }}'} restent :
                  le premier place le logo, le second le texte envoyé.
                </FieldDescription>
                <Textarea
                  id={`${fieldId}-email-html`}
                  value={emailHtml}
                  spellCheck={false}
                  className="max-h-96 font-mono"
                  onChange={(event) => {
                    setEmailHtml(event.target.value)
                    touch('email')
                  }}
                />
              </Field>
              <Row
                title="E-mail de test"
                description="Envoie le gabarit et le logo déjà enregistrés, pour vérifier la mise en page."
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={!emailTestReady || sendingTest || pending}
                  onClick={() => void sendTestEmail()}
                >
                  Envoyer
                </Button>
              </Row>
            </Rows>
            {saveBar('email', () => void saveEmail())}
          </Section>

          <Section id="courrier" title="Courrier postal (via La Poste)">
            <FieldDescription>Intégration en cours</FieldDescription>
          </Section>

          <Section id="signature" title="Signature électronique (via La Poste)">
            <FieldDescription>Intégration en cours</FieldDescription>
          </Section>
        </div>
      </main>
    </div>
  )
}
