import { ArrowLeft, Plus } from 'lucide-react'
import { type ReactNode, type RefObject, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useAgentIdentity } from '@/contexts/AgentIdentityContext'
import {
  type MarkdownReader,
  PromptMarkdownEditor
} from '@/features/automations/components/PromptMarkdownEditor'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FileDrop } from '@/shared/components/FileDrop'
import { Button } from '@/shared/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import { hydrateCustomizationFromServer } from '@/shared/lib/instance-customization'

import { RepaymentMessagesCard } from './RepaymentMessagesCard'
import { jsonSyntaxError, TICKETS_JSON_EXAMPLE, ticketsConfigOrExample } from './setup-json'
import { recordedPhrase, REPAYMENT_DOCUMENTS, type SetupPiece, setupPieces } from './setup-pieces'
import { StoredMark } from './StoredMark'

export const ENTRIES = [
  {
    id: 'chatbots/default',
    label: 'Agents conversationnels',
    json: 'chatbots/default',
    prose: 'chatbots/default/AGENTS.md',
    file: null
  },
  {
    id: 'tickets',
    label: 'Réclamations',
    json: 'tickets',
    prose: 'tickets/AGENTS.md',
    file: 'tickets/letter.docx'
  },
  {
    id: 'repayment',
    label: 'Impayés',
    json: 'repayment',
    prose: 'repayment/AGENTS.md',
    file: null
  },
  { id: 'about/AGENTS.md', label: 'Synthèses', json: null, prose: 'about/AGENTS.md', file: null },
  {
    id: 'automations/AGENTS.md',
    label: 'Générer un rapport',
    json: null,
    prose: 'automations/AGENTS.md',
    file: null
  }
] as const

export type EntryId = (typeof ENTRIES)[number]['id']

const CHATBOT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/
const CHATBOT_KEY = /^chatbots\/([a-z0-9][a-z0-9_-]{0,63})$/
const CHATBOT_PROSE = /^chatbots\/([a-z0-9][a-z0-9_-]{0,63})\/AGENTS\.md$/
const AGENT_CONSIGNE_LINES = { min: 3 }
const DRAFT = '__draft__'
const USER_MANUAL_URL = 'https://github.com/charnould/pierre/tree/master/docs/src/05-user-manual'

function DocumentationLink() {
  return (
    <a href={USER_MANUAL_URL} target="_blank" rel="noreferrer">
      documentation
    </a>
  )
}

function AgentPromptHelp() {
  return (
    <>
      Saisissez un prompt système conforme à la <DocumentationLink /> pour définir le comportement
      de l’agent. Il est recommandé de partir du prompt proposé et de ne supprimer aucune rubrique
      dont vous ne comprenez pas l’utilité.
    </>
  )
}

function draftAgentId(json: string, taken: readonly string[]): { id: string } | { error: string } {
  let root: unknown
  try {
    root = JSON.parse(json)
  } catch {
    return { error: 'JSON invalide.' }
  }
  const id =
    root != null && typeof root === 'object' && !Array.isArray(root)
      ? (root as { id?: unknown }).id
      : undefined
  if (typeof id !== 'string' || !CHATBOT_ID.test(id) || id === 'default' || id === 'icons') {
    return { error: 'Identifiant invalide' }
  }
  if (taken.includes(id)) return { error: 'Identifiant déjà utilisé.' }
  return { id }
}

function knownChatbotIds(texts: Record<string, string | null>): string[] {
  const ids = new Set<string>()
  for (const key of Object.keys(texts)) {
    const id = CHATBOT_KEY.exec(key)?.[1] ?? CHATBOT_PROSE.exec(key)?.[1]
    if (id) ids.add(id)
  }
  return [...ids]
}

function agentKnown(texts: Record<string, string | null>, id: string): boolean {
  return Object.hasOwn(texts, `chatbots/${id}`) || Object.hasOwn(texts, `chatbots/${id}/AGENTS.md`)
}

function storedText(texts: Record<string, string | null>, id: string): string {
  const stored = texts[id]
  return stored && stored.trim() ? stored : ''
}

function syncChatbotDrafts(
  current: Record<string, string>,
  texts: Record<string, string | null>,
  dirty: ReadonlySet<string>
): Record<string, string> {
  const next = { ...current }
  for (const id of new Set(['default', ...knownChatbotIds(texts)])) {
    if (dirty.has(id)) continue
    next[id] = storedText(texts, `chatbots/${id}`)
  }
  return next
}

function readDisplay(json: string): { parsed: true; display?: string } | { parsed: false } {
  try {
    const root = JSON.parse(json) as { display?: unknown }
    if (root == null || typeof root !== 'object' || Array.isArray(root)) return { parsed: true }
    const display = root.display
    if (typeof display === 'string' && display.trim())
      return { parsed: true, display: display.trim() }
    return { parsed: true }
  } catch {
    return { parsed: false }
  }
}

function shownAgentName(id: string, draft: string | undefined, stored: string): string {
  const current = draft === undefined ? { parsed: false as const } : readDisplay(draft)
  const resolved = current.parsed ? current : readDisplay(stored)
  return resolved.parsed && resolved.display ? resolved.display : id
}

function agentLabel(id: string, draft: string | undefined, stored: string): string {
  return `Agent « ${shownAgentName(id, draft, stored)} »`
}

function isSvg(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

function isDocx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.docx')
}

function acceptFile(
  files: File[],
  matches: (file: File) => boolean,
  rejectTitle: string,
  onFile: (file: File) => void
) {
  const file = files[0]
  if (!file) return
  if (!matches(file)) {
    toast.add({ title: rejectTitle, type: 'error' })
    return
  }
  onFile(file)
}

export { StoredMark } from './StoredMark'

export function TemplateOptionLabel({ name, stored }: { name: string; stored: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {stored ? <StoredMark name={`Modèle ${name}, enregistré`} /> : null}
      <span aria-hidden={stored || undefined}>{name}</span>
    </span>
  )
}

function storedName(
  pieces: readonly SetupPiece[],
  id: string | null,
  label: string
): string | undefined {
  if (!id || !pieces.some((item) => item.id === id && item.done)) return undefined
  return recordedPhrase(label)
}

function agentConfigured(pieces: readonly SetupPiece[], id: string): boolean {
  const configured =
    storedName(pieces, `chatbots/${id}`, 'Configuration') !== undefined &&
    storedName(pieces, `chatbots/${id}/AGENTS.md`, 'Prompt système') !== undefined
  if (id !== 'default') return configured
  return configured && storedName(pieces, 'chatbots/icons/icon.svg', 'Icône') !== undefined
}

function Section({
  id,
  title,
  mark,
  pending = false,
  children
}: {
  id: string
  title: string
  mark?: string
  pending?: boolean
  children: ReactNode
}) {
  const status = mark ? (
    <StoredMark name={mark} />
  ) : pending ? (
    <StoredMark stored={false} name="À paramétrer" />
  ) : null
  return (
    <section aria-labelledby={id}>
      <Card>
        <CardHeader>
          <CardTitle id={id}>{title}</CardTitle>
          {status ? <CardAction>{status}</CardAction> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
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
  mark,
  children
}: {
  title: string
  description?: ReactNode
  htmlFor?: string
  mark?: string | false
  children: ReactNode
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={htmlFor}>{title}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      <div className="flex items-center justify-end gap-2">
        {mark === undefined ? null : (
          <StoredMark stored={Boolean(mark)} name={mark || 'À paramétrer'} />
        )}
        {children}
      </div>
    </Field>
  )
}

function FittedJson({
  id,
  value,
  error,
  minRows = 1,
  onChange
}: {
  id?: string
  value: string
  error?: string
  minRows?: number
  onChange: (value: string) => void
}) {
  return (
    <Textarea
      id={id}
      mono
      rows={minRows}
      spellCheck={false}
      aria-invalid={error ? true : undefined}
      className="min-h-0 resize-none overflow-hidden"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function JsonCard({
  id,
  mark,
  description,
  example,
  value,
  error,
  embedded = false,
  onChange
}: {
  id: string
  mark?: string
  description: string
  example?: string
  value: string
  error?: string
  embedded?: boolean
  onChange: (value: string) => void
}) {
  const field = (
    <Field data-invalid={error ? true : undefined}>
      <FieldDescription>{description}</FieldDescription>
      {example ? <pre className="font-mono text-xs whitespace-pre-wrap">{example}</pre> : null}
      <FittedJson id={id} minRows={3} value={value} error={error} onChange={onChange} />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
  if (embedded) return field
  return (
    <Section id={id} title="Configuration" mark={mark} pending>
      {field}
    </Section>
  )
}

function ConsigneCard({
  id,
  mark,
  description,
  value,
  error,
  embedded = false,
  readerRef,
  onEdit
}: {
  id: string
  mark?: string
  description: ReactNode
  value: string
  error?: string
  embedded?: boolean
  readerRef: RefObject<MarkdownReader | null>
  onEdit: () => void
}) {
  const field = (
    <Field data-invalid={error ? true : undefined}>
      {embedded ? (
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor={id}>Prompt système</FieldLabel>
          {mark ? <StoredMark name={mark} /> : null}
        </div>
      ) : null}
      <FieldDescription>{description}</FieldDescription>
      <PromptMarkdownEditor
        className="h-96 max-h-96"
        key={`${id}:${value.length}`}
        id={id}
        value={value}
        placeholder="AGENTS.md"
        readerRef={readerRef}
        onChange={onEdit}
      />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
  if (embedded) return field
  return (
    <Section id="setup-consigne" title="Prompt système" mark={mark} pending>
      {field}
    </Section>
  )
}

function FileCard({
  id,
  title,
  mark,
  description,
  preview,
  placeholder,
  accept,
  rejectTitle,
  matches,
  onFile
}: {
  id: string
  title: string
  mark?: string
  description: string
  preview?: ReactNode
  placeholder: string
  accept: string
  rejectTitle: string
  matches: (file: File) => boolean
  onFile: (file: File) => void
}) {
  return (
    <Section id={id} title={title} mark={mark} pending>
      <Field>
        <FieldDescription>{description}</FieldDescription>
        <div className="flex items-center gap-3">
          {preview}
          <FileDrop
            className="min-w-0 flex-1"
            accept={accept}
            placeholder={placeholder}
            onFiles={(files) => acceptFile(files, matches, rejectTitle, onFile)}
          />
        </div>
      </Field>
    </Section>
  )
}

function RepaymentDocumentFields({
  stored,
  onFile
}: {
  stored: ReadonlySet<string>
  onFile: (file: File, id: string) => void
}) {
  return (
    <>
      {REPAYMENT_DOCUMENTS.map((document) => (
        <Row
          key={document.id}
          title={document.label}
          description={document.description}
          htmlFor={document.fieldId}
          mark={stored.has(document.id) ? recordedPhrase(document.label) : false}
        >
          <FileDrop
            id={document.fieldId}
            accept=".docx"
            placeholder="Déposer le DOCX"
            onFiles={(files) =>
              acceptFile(files, isDocx, 'Le document doit être un DOCX', (file) =>
                onFile(file, document.id)
              )
            }
          />
        </Row>
      ))}
    </>
  )
}

export function RepaymentDocuments({
  stored,
  onFile
}: {
  stored: ReadonlySet<string>
  onFile: (file: File, id: string) => void
}) {
  return (
    <Section id="setup-documents" title="Documents">
      <Rows>
        <RepaymentDocumentFields stored={stored} onFile={onFile} />
      </Rows>
    </Section>
  )
}

function AgentJsonField({
  id,
  mark,
  description,
  value,
  error,
  onChange
}: {
  id: string
  mark?: string
  description: ReactNode
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor={id}>Configuration</FieldLabel>
        {mark ? <StoredMark name={mark} /> : null}
      </div>
      <FieldDescription>{description}</FieldDescription>
      <FittedJson id={id} minRows={3} value={value} error={error} onChange={onChange} />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
}

function AgentConsigneField({
  id,
  mark,
  description,
  value,
  error,
  onChange
}: {
  id: string
  mark?: string
  description: ReactNode
  value: string
  error?: string
  onChange: (markdown: string) => void
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor={id}>Prompt système</FieldLabel>
        {mark ? <StoredMark name={mark} /> : null}
      </div>
      <FieldDescription>{description}</FieldDescription>
      <PromptMarkdownEditor
        key={`${id}:${value.length}`}
        id={id}
        value={value}
        placeholder="AGENTS.md"
        lines={AGENT_CONSIGNE_LINES}
        onChange={onChange}
      />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
}

function AgentCard({
  id,
  title,
  phrase,
  ready,
  onDeactivate,
  onDelete,
  children
}: {
  id: string
  title: string
  phrase: string
  ready?: boolean
  onDeactivate?: () => void
  onDelete?: () => void
  children: ReactNode
}) {
  const titleId = `${id}-title`
  return (
    <section id={id} aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle id={titleId}>{title}</CardTitle>
          {ready !== undefined || onDeactivate || onDelete ? (
            <CardAction>
              <div className="flex items-center gap-2">
                {ready !== undefined ? (
                  <StoredMark
                    stored={ready}
                    name={ready ? `${title}, enregistré` : `${title}, à paramétrer`}
                  />
                ) : null}
                {onDeactivate ? (
                  <Button type="button" variant="outline" onClick={onDeactivate}>
                    Désactiver
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Supprimer ${title}`}
                    onClick={onDelete}
                  >
                    Supprimer
                  </Button>
                ) : null}
              </div>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldDescription>{phrase}</FieldDescription>
            {children}
          </FieldGroup>
        </CardContent>
      </Card>
    </section>
  )
}

function ChatbotsSetup({ url, onBack }: { url: string; onBack: () => void }) {
  const agentName = useAgentIdentity().name
  const newAgentFieldId = useId()
  const [texts, setTexts] = useState<Record<string, string | null>>({})
  const [binaries, setBinaries] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [tab, setTab] = useState('default')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('Aucune modification')
  const [saving, setSaving] = useState(false)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const proseDrafts = useRef<Record<string, string>>({})
  const seenProse = useRef<Record<string, string>>({})
  const dirtyJson = useRef(new Set<string>())
  const textsRef = useRef(texts)
  const others = useMemo(() => {
    return knownChatbotIds(texts)
      .filter((id) => id !== 'default')
      .sort((a, b) => a.localeCompare(b, 'fr'))
  }, [texts])
  const activeTab = tab === 'default' || tab === DRAFT || others.includes(tab) ? tab : 'default'
  const nameFor = (id: string) =>
    shownAgentName(id, drafts[id], storedText(texts, `chatbots/${id}`))
  const labelFor = (id: string) => agentLabel(id, drafts[id], storedText(texts, `chatbots/${id}`))
  const showIcon = Boolean(url) && binaries.includes('chatbots/icons/icon.svg')
  const visibleIconUrl = showIcon ? iconUrl : null

  function applyTexts(nextTexts: Record<string, string | null>, nextBinaries?: string[]) {
    textsRef.current = nextTexts
    setTexts(nextTexts)
    if (nextBinaries) setBinaries(nextBinaries)
    setDrafts((current) => syncChatbotDrafts(current, nextTexts, dirtyJson.current))
  }

  async function load() {
    const response = await window.api?.getAdminSetup?.({ url })
    if (!response) return
    applyTexts(response.texts, response.binaries)
  }

  useEffect(() => {
    if (!url) return
    let cancelled = false
    void (window.api?.getAdminSetup?.({ url }) ?? Promise.resolve(null)).then((response) => {
      if (cancelled || !response) return
      applyTexts(response.texts, response.binaries)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const read = window.api?.getSetupFile
    if (!showIcon || !read) return
    let active = true
    let objectUrl: string | null = null
    void read({ url, id: 'chatbots/icons/icon.svg' }).then((buffer) => {
      if (!active || !buffer) return
      objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'image/svg+xml' }))
      setIconUrl(objectUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [binaries, showIcon, url])

  async function putText(id: string, body: string): Promise<string | null> {
    const response = await window.api?.putAdminSetup?.({ url, id, body })
    if (!response?.data) return response?.error?.message ?? 'Enregistrement refusé'
    return null
  }

  function editJson(id: string, value: string) {
    dirtyJson.current.add(id)
    setDrafts((current) => ({ ...current, [id]: value }))
    setStatus('Modifications à enregistrer')
  }

  function dropDraft() {
    dirtyJson.current.delete(DRAFT)
    delete proseDrafts.current[DRAFT]
    delete seenProse.current[DRAFT]
    setDrafts((current) => {
      if (!Object.hasOwn(current, DRAFT)) return current
      const next = { ...current }
      delete next[DRAFT]
      return next
    })
  }

  async function save() {
    setSaving(true)
    const errors: Record<string, string> = {}
    const written: Record<string, string> = {}
    const jobs: Array<[string, string]> = []
    for (const id of ['default', ...others]) {
      const jsonId = `chatbots/${id}`
      const proseId = `${jsonId}/AGENTS.md`
      const json = drafts[id] ?? ''
      const prose = proseDrafts.current[id] ?? storedText(texts, proseId)
      if (!agentKnown(texts, id) && !json.trim() && !prose.trim()) continue
      const syntax = jsonSyntaxError(json)
      if (syntax) errors[jsonId] = syntax
      else jobs.push([jsonId, json])
      jobs.push([proseId, prose])
    }
    let createdId: string | null = null
    const draftJson = drafts[DRAFT] ?? ''
    const draftProse = proseDrafts.current[DRAFT] ?? ''
    if (draftJson.trim() || draftProse.trim()) {
      const syntax = jsonSyntaxError(draftJson)
      const parsed = syntax ? { error: syntax } : draftAgentId(draftJson, others)
      if ('error' in parsed) errors[`chatbots/${DRAFT}`] = parsed.error
      else {
        createdId = parsed.id
        jobs.push(
          [`chatbots/${parsed.id}`, draftJson],
          [`chatbots/${parsed.id}/AGENTS.md`, draftProse]
        )
      }
    }
    for (const [id, body] of jobs) {
      const message = await putText(id, body)
      if (message) errors[id] = message
      else {
        written[id] = body
        const agentId = CHATBOT_KEY.exec(id)?.[1]
        if (agentId) dirtyJson.current.delete(agentId)
        const proseAgent = CHATBOT_PROSE.exec(id)?.[1]
        if (proseAgent) delete proseDrafts.current[proseAgent]
      }
    }
    const draftReady =
      createdId != null &&
      written[`chatbots/${createdId}`] != null &&
      written[`chatbots/${createdId}/AGENTS.md`] != null
    if (createdId && !draftReady) {
      const jsonError = errors[`chatbots/${createdId}`]
      const proseError = errors[`chatbots/${createdId}/AGENTS.md`]
      if (jsonError) errors[`chatbots/${DRAFT}`] = jsonError
      if (proseError) errors[`chatbots/${DRAFT}/AGENTS.md`] = proseError
      delete errors[`chatbots/${createdId}`]
      delete errors[`chatbots/${createdId}/AGENTS.md`]
      delete written[`chatbots/${createdId}`]
      delete written[`chatbots/${createdId}/AGENTS.md`]
    }
    setFieldErrors(errors)
    setSaving(false)
    if (draftReady) dropDraft()
    const messages = Object.values(errors)
    if (messages.length === 0) {
      dirtyJson.current.clear()
      proseDrafts.current = {}
      setStatus('Enregistré')
      await load()
      if (createdId) setTab(createdId)
      await hydrateCustomizationFromServer(url)
      return
    }
    for (const message of messages) toast.add({ title: message, type: 'error' })
    if (Object.keys(written).length > 0) applyTexts({ ...textsRef.current, ...written })
    if (draftReady && createdId) setTab(createdId)
  }

  async function upload(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const response = await window.api?.putAdminSetup?.({
      url,
      id: 'chatbots/icons/icon.svg',
      bytes
    })
    if (!response?.data) {
      toast.add({ title: response?.error?.message ?? 'Téléversement refusé', type: 'error' })
      return
    }
    setStatus('Téléversé')
    await load()
    await hydrateCustomizationFromServer(url)
  }

  async function removeAgent(id: string) {
    const known = agentKnown(texts, id)
    setDeleteId(null)
    if (known) {
      const response = await window.api?.deleteAdminChatbot?.({ url, id })
      if (!response) {
        toast.add({ title: 'Suppression refusée', type: 'error' })
        return
      }
    }
    dirtyJson.current.delete(id)
    delete proseDrafts.current[id]
    delete seenProse.current[id]
    setDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[`chatbots/${id}`]
      delete next[`chatbots/${id}/AGENTS.md`]
      return next
    })
    setStatus('Agent supprimé')
    setTab((current) => (current === id ? 'default' : current))
    if (known) await load()
  }

  async function deactivatePublic() {
    setDeactivateOpen(false)
    const response = await window.api?.deleteAdminChatbot?.({ url, id: 'default' })
    if (!response) {
      toast.add({ title: 'Désactivation refusée', type: 'error' })
      return
    }
    dirtyJson.current.delete('default')
    delete proseDrafts.current.default
    delete seenProse.current.default
    setDrafts((current) => {
      const next = { ...current }
      delete next.default
      return next
    })
    setFieldErrors((current) => {
      const next = { ...current }
      delete next['chatbots/default']
      delete next['chatbots/default/AGENTS.md']
      return next
    })
    setStatus('Agent public désactivé')
    await load()
    await hydrateCustomizationFromServer(url)
  }

  function noteProse(id: string, markdown: string) {
    proseDrafts.current[id] = markdown
    const key = String(storedText(texts, `chatbots/${id}/AGENTS.md`).length)
    if (seenProse.current[id] !== key) {
      seenProse.current[id] = key
      return
    }
    setStatus('Modifications à enregistrer')
  }

  function agentFields(id: string, configuration: ReactNode, consigne: ReactNode) {
    const jsonId = `chatbots/${id}`
    const proseId = `${jsonId}/AGENTS.md`
    return (
      <>
        <AgentJsonField
          id={jsonId}
          description={configuration}
          value={drafts[id] ?? ''}
          error={fieldErrors[jsonId]}
          onChange={(value) => editJson(id, value)}
        />
        <AgentConsigneField
          id={proseId}
          description={consigne}
          value={storedText(texts, proseId)}
          error={fieldErrors[proseId]}
          onChange={(markdown) => noteProse(id, markdown)}
        />
      </>
    )
  }

  const publicPieces = setupPieces('chatbots/default', texts, binaries, 'default')
  const publicReady = agentConfigured(publicPieces, 'default')
  const consigne = <AgentPromptHelp />

  return (
    <main className="bg-background min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-document mx-auto flex w-full flex-col gap-4">
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
          <h1 className="font-serif text-4xl leading-tight font-normal">Agents conversationnels</h1>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (typeof value === 'string') setTab(value)
          }}
        >
          <TabsList aria-label="Agents">
            <TabsTrigger value="default">Agent public</TabsTrigger>
            {others.map((id) => (
              <TabsTrigger key={id} value={id}>
                {nameFor(id)}
              </TabsTrigger>
            ))}
            <TabsTrigger value={DRAFT} aria-label="Nouvel agent">
              <Plus aria-hidden />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="default" keepMounted>
            <AgentCard
              id="agent-public"
              title="Agent public"
              ready={publicReady}
              onDeactivate={publicReady ? () => setDeactivateOpen(true) : undefined}
              phrase={`Important — Le paramétrage de cet agent le rend immédiatement accessible aux visiteurs du site internet de votre organisme, via l’adresse publique (${url}) de votre instance ${agentName}, ainsi qu'aux collaborateurs depuis l’application Desktop.`}
            >
              <Row
                title="Icône"
                htmlFor={`${newAgentFieldId}-icon`}
                description={
                  <>
                    Icône de l’agent conversationnel public, utilisée sur {url}, ainsi que lors de
                    l’installation de {agentName} en tant qu’application web progressive (PWA) sur
                    smartphone. Seul le format SVG est accepté.
                  </>
                }
              >
                <div className="flex min-w-0 items-center gap-3">
                  {visibleIconUrl ? (
                    <img
                      src={visibleIconUrl}
                      alt="Icône enregistrée"
                      className="border-input bg-background h-8 w-auto max-w-48 shrink-0 rounded-md border object-contain p-0.5"
                    />
                  ) : null}
                  <FileDrop
                    id={`${newAgentFieldId}-icon`}
                    className="min-w-0 flex-1"
                    accept=".svg"
                    placeholder="Déposer votre icône ici"
                    onFiles={(files) =>
                      acceptFile(
                        files,
                        isSvg,
                        'L’icône doit être un SVG',
                        (file) => void upload(file)
                      )
                    }
                  />
                </div>
              </Row>
              {agentFields(
                'default',
                <>
                  Collez ci-dessous un JSON valide, conforme à la <DocumentationLink />.
                </>,
                consigne
              )}
            </AgentCard>
          </TabsContent>
          {others.map((id) => (
            <TabsContent key={id} value={id} keepMounted>
              <AgentCard
                id={`agent-${id}`}
                title={labelFor(id)}
                ready={agentConfigured(setupPieces('chatbots/default', texts, binaries, id), id)}
                phrase="Important — Aucun agent n’est créé tant que sa configuration n’a pas été correctement renseignée et enregistrée. Sa création ne le rend pas automatiquement accessible aux collaborateurs. Pour cela, vous devez ensuite l’affecter aux utilisateurs (rubrique « Utilisateurs ») et lui associer des connaissances (rubrique « Encyclopédie »)."
                onDelete={() => setDeleteId(id)}
              >
                {agentFields(
                  id,
                  <>
                    Collez ci-dessous un JSON valide, conforme à la <DocumentationLink />.
                  </>,
                  consigne
                )}
              </AgentCard>
            </TabsContent>
          ))}
          <TabsContent value={DRAFT} keepMounted>
            <AgentCard
              id="nouvel-agent"
              title="Nouvel agent spécialisé"
              phrase="Important — Aucun agent n’est créé tant que sa configuration n’a pas été correctement renseignée et enregistrée. Sa création ne le rend pas automatiquement accessible aux collaborateurs. Pour cela, vous devez ensuite l’affecter aux utilisateurs (rubrique « Utilisateurs ») et lui associer des connaissances (rubrique « Encyclopédie »)."
            >
              {agentFields(
                DRAFT,
                <>
                  Collez ci-dessous un JSON valide, conforme à la <DocumentationLink />.
                </>,
                consigne
              )}
            </AgentCard>
          </TabsContent>
        </Tabs>
        <footer className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
            Enregistrer
          </Button>
          <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
            {status}
          </p>
        </footer>
      </div>
      <ConfirmDialog
        open={deactivateOpen}
        title="Désactiver l’agent public"
        description="Le site et Discuter ne proposeront plus cet agent. Le JSON, le prompt système et l’icône seront retirés."
        confirmLabel="Désactiver"
        confirmVariant="destructive"
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={() => void deactivatePublic()}
      />
      <ConfirmDialog
        open={deleteId !== null}
        title="Supprimer l’agent"
        description={`L’agent ${deleteId ?? ''} et son prompt système seront supprimés.`}
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void removeAgent(deleteId)
        }}
      />
    </main>
  )
}

export function SetupPanel({
  url,
  entryId,
  onBack
}: {
  url: string
  entryId: EntryId
  onBack: () => void
}) {
  if (entryId === 'chatbots/default') return <ChatbotsSetup url={url} onBack={onBack} />
  return <ModuleSetup key={entryId} url={url} entryId={entryId} onBack={onBack} />
}

function ModuleSetup({
  url,
  entryId,
  onBack
}: {
  url: string
  entryId: EntryId
  onBack: () => void
}) {
  const [texts, setTexts] = useState<Record<string, string | null>>({})
  const [binaries, setBinaries] = useState<string[]>([])
  const [jsonOverride, setJsonOverride] = useState<{ entryId: EntryId; value: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const proseReader = useRef<MarkdownReader | null>(null)
  const seenProseKey = useRef('')
  const messageDrafts = useRef<string[] | null>(null)
  const [status, setStatus] = useState('Aucune modification')
  const [saving, setSaving] = useState(false)
  const entry = ENTRIES.find((item) => item.id === entryId) ?? ENTRIES[1]
  const jsonId = entry.json
  const proseId = entry.prose
  const storedJson = jsonId ? storedText(texts, jsonId) : ''
  const serverJson = jsonId === 'tickets' ? ticketsConfigOrExample(storedJson) : storedJson
  const jsonDraft = jsonOverride?.entryId === entryId ? jsonOverride.value : serverJson
  function editJson(value: string) {
    setJsonOverride({ entryId, value })
    setStatus('Modifications à enregistrer')
  }
  function noteProseEdit() {
    const key = `${proseId ?? ''}:${proseId ? storedText(texts, proseId).length : 0}`
    if (seenProseKey.current !== key) {
      seenProseKey.current = key
      return
    }
    setStatus('Modifications à enregistrer')
  }

  async function load() {
    const response = await window.api?.getAdminSetup?.({ url })
    if (!response) return
    setTexts(response.texts)
    setBinaries(response.binaries)
  }

  useEffect(() => {
    if (!url) return
    let cancelled = false
    void (window.api?.getAdminSetup?.({ url }) ?? Promise.resolve(null)).then((response) => {
      if (cancelled || !response) return
      setTexts(response.texts)
      setBinaries(response.binaries)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  async function putText(id: string, body: string): Promise<string | null> {
    const response = await window.api?.putAdminSetup?.({ url, id, body })
    if (!response?.data) return response?.error?.message ?? 'Enregistrement refusé'
    return null
  }

  async function save() {
    setSaving(true)
    const errors: Record<string, string> = {}
    const written: Record<string, string> = {}
    const jobs: Array<[string, string]> = []
    if (jsonId === 'tickets') {
      const next = ticketsConfigOrExample(jsonDraft)
      if (next !== jsonDraft) setJsonOverride({ entryId, value: next })
      jobs.push([jsonId, next])
    } else if (jsonId) {
      const syntax = jsonSyntaxError(jsonDraft)
      if (syntax) errors[jsonId] = syntax
      else jobs.push([jsonId, jsonDraft])
    }
    if (proseId) jobs.push([proseId, proseReader.current?.read() ?? ''])
    if (entryId === 'repayment' && messageDrafts.current?.some((text) => text.trim())) {
      jobs.push([
        'repayment/messages',
        JSON.stringify(messageDrafts.current.filter((text) => text.trim()))
      ])
    }
    for (const [id, body] of jobs) {
      const message = await putText(id, body)
      if (message) errors[id] = message
      else written[id] = body
    }
    setFieldErrors(errors)
    setSaving(false)
    const messages = Object.values(errors)
    if (messages.length === 0) {
      setJsonOverride(null)
      setStatus('Enregistré')
      await load()
      await hydrateCustomizationFromServer(url)
      return
    }
    for (const message of messages) toast.add({ title: message, type: 'error' })
    if (jsonId && written[jsonId] !== undefined) setJsonOverride(null)
    if (Object.keys(written).length > 0) setTexts((current) => ({ ...current, ...written }))
  }

  async function upload(file: File, id: string) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const response = await window.api?.putAdminSetup?.({ url, id, bytes })
    if (!response?.data) {
      toast.add({ title: response?.error?.message ?? 'Téléversement refusé', type: 'error' })
      return
    }
    setStatus('Téléversé')
    await load()
    await hydrateCustomizationFromServer(url)
  }

  const pieces = setupPieces(entryId, texts, binaries)

  const proseValue = proseId ? storedText(texts, proseId) : ''
  const proseError = proseId ? fieldErrors[proseId] : undefined

  return (
    <main className="bg-background min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-document mx-auto flex w-full flex-col gap-4">
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
          <h1 className="font-serif text-4xl leading-tight font-normal">{entry.label}</h1>
        </div>
        {entryId === 'repayment' && jsonId && proseId ? (
          <RepaymentMessagesCard
            url={url}
            stored={texts['repayment/messages'] ?? null}
            mark={storedName(pieces, jsonId, 'Configuration')}
            onDrafts={(next) => {
              messageDrafts.current = next
            }}
            onTouch={() => setStatus('Modifications à enregistrer')}
          >
            <JsonCard
              embedded
              id="setup-configuration-json"
              description="Définisser le fonctionnement du module, notamment les phases, actions, tags, et modalités de l’échéancier."
              value={jsonDraft}
              error={fieldErrors[jsonId]}
              onChange={editJson}
            />
          </RepaymentMessagesCard>
        ) : null}
        {entryId === 'repayment' ? (
          <RepaymentDocuments
            stored={new Set(binaries)}
            onFile={(file, id) => void upload(file, id)}
          />
        ) : null}
        {entryId === 'repayment' && proseId ? (
          <ConsigneCard
            id={proseId}
            mark={storedName(pieces, proseId, 'Prompt système')}
            description="Insérer ci-dessous un prompt système valide et conforme à la documentation."
            value={proseValue}
            error={proseError}
            readerRef={proseReader}
            onEdit={noteProseEdit}
          />
        ) : null}
        {entryId !== 'repayment' && jsonId ? (
          <JsonCard
            id="setup-configuration"
            mark={storedName(pieces, jsonId, 'Configuration')}
            description="Paniers, actions et étiquettes du tableau des réclamations. Le prompt système est le champ suivant."
            example={entryId === 'tickets' ? TICKETS_JSON_EXAMPLE : undefined}
            value={jsonDraft}
            error={fieldErrors[jsonId]}
            onChange={editJson}
          />
        ) : null}
        {entryId !== 'repayment' && proseId ? (
          <ConsigneCard
            id={proseId}
            mark={storedName(pieces, proseId, 'Prompt système')}
            description={
              entryId === 'about/AGENTS.md' ? (
                'Texte suivi pour rédiger un briefing : quoi retenir, dans quel ordre, et quoi signaler s’il manque une donnée.'
              ) : entryId === 'automations/AGENTS.md' ? (
                'Texte suivi quand une automatisation rédige un rapport.'
              ) : (
                <AgentPromptHelp />
              )
            }
            value={proseValue}
            error={proseError}
            readerRef={proseReader}
            onEdit={noteProseEdit}
          />
        ) : null}
        {entryId === 'tickets' ? (
          <FileCard
            id="setup-letter"
            title="Courrier"
            mark={storedName(pieces, 'tickets/letter.docx', 'Courrier')}
            description="Modèle Word des courriers de réclamation."
            placeholder="Déposer votre courrier ici"
            accept=".docx"
            rejectTitle="Le document doit être un DOCX"
            matches={isDocx}
            onFile={(file) => void upload(file, 'tickets/letter.docx')}
          />
        ) : null}
        <footer className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
            Enregistrer
          </Button>
          <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
            {status}
          </p>
        </footer>
      </div>
    </main>
  )
}
