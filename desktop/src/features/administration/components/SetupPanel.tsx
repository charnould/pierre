import { ArrowLeft, CircleCheck, FileUpIcon } from 'lucide-react'
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  type MarkdownReader,
  PromptMarkdownEditor
} from '@/features/automations/components/PromptMarkdownEditor'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton } from '@/shared/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import { filesFromDataTransfer, hasDraggedFiles } from '@/shared/lib/attachment-files'
import { hydrateCustomizationFromServer } from '@/shared/lib/instance-customization'

import { RepaymentMessagesCard } from './RepaymentMessagesCard'
import { jsonSyntaxError, TICKETS_JSON_EXAMPLE, ticketsConfigOrExample } from './setup-json'
import { recordedPhrase, REPAYMENT_DOCUMENTS, type SetupPiece, setupPieces } from './setup-pieces'

export const ENTRIES = [
  {
    id: 'chatbots/default',
    label: 'Chatbot',
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

function storedText(texts: Record<string, string | null>, id: string): string {
  const stored = texts[id]
  return stored && stored.trim() ? stored : ''
}

function isSvg(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

function isDocx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.docx')
}

export function StoredMark({ name }: { name: string }) {
  return <CircleCheck aria-label={name} className="size-4 shrink-0" strokeWidth={1.5} />
}

export function TemplateOptionLabel({ name, stored }: { name: string; stored: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {stored ? <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} /> : null}
      {stored ? <span className="sr-only">Modèle {name}, enregistré</span> : null}
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
            {mark ? <StoredMark name={mark} /> : null}
          </div>
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
  mark?: string
  children: ReactNode
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor={htmlFor}>{title}</FieldLabel>
          {mark ? <StoredMark name={mark} /> : null}
        </div>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      {children}
    </Field>
  )
}

function fit(node: HTMLTextAreaElement) {
  node.style.height = 'auto'
  node.style.height = `${node.scrollHeight}px`
}

function FittedJson({
  id,
  value,
  error,
  onChange
}: {
  id?: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    if (ref.current) fit(ref.current)
  }, [value])
  return (
    <Textarea
      ref={ref}
      id={id}
      mono
      rows={1}
      spellCheck={false}
      aria-invalid={error ? true : undefined}
      className="field-sizing-fixed min-h-0 resize-none overflow-hidden"
      value={value}
      onChange={(event) => {
        fit(event.currentTarget)
        onChange(event.target.value)
      }}
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
      {embedded ? (
        <FittedJson value={value} id={id} error={error} onChange={onChange} />
      ) : (
        <Textarea
          mono
          className="max-h-96"
          value={value}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
  if (embedded) return field
  return (
    <Section id={id} title="Configuration" mark={mark}>
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
  description: string
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
          <FieldLabel htmlFor={id}>Consigne</FieldLabel>
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
    <Section id="setup-consigne" title="Consigne" mark={mark}>
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
    <Section id={id} title={title} mark={mark}>
      <Field>
        <FieldDescription>{description}</FieldDescription>
        <div className="flex items-center gap-3">
          {preview}
          <SetupFileDrop
            className="min-w-0 flex-1"
            accept={accept}
            placeholder={placeholder}
            rejectTitle={rejectTitle}
            matches={matches}
            onFile={onFile}
          />
        </div>
      </Field>
    </Section>
  )
}

export function SetupFileDrop({
  id,
  className,
  accept,
  placeholder = 'Déposez des fichiers ici',
  rejectTitle,
  matches,
  onFile
}: {
  id?: string
  className?: string
  accept: string
  placeholder?: string
  rejectTitle: string
  matches: (file: File) => boolean
  onFile: (file: File) => void
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dropActive, setDropActive] = useState(false)

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return
    event.preventDefault()
    dragDepthRef.current += 1
    setDropActive(true)
  }

  function handleDragLeave() {
    if (dragDepthRef.current === 0) return
    dragDepthRef.current -= 1
    if (dragDepthRef.current === 0) setDropActive(false)
  }

  function take(files: File[]) {
    const file = files[0]
    if (!file) return
    if (!matches(file)) {
      toast.add({ title: rejectTitle, type: 'error' })
      return
    }
    onFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return
    event.preventDefault()
    dragDepthRef.current = 0
    setDropActive(false)
    take(filesFromDataTransfer(event.dataTransfer))
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    take(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  return (
    <InputGroup
      className={className}
      data-drop-active={dropActive}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => {
        if (!hasDraggedFiles(event.dataTransfer)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />
      <InputGroupAddon align="block-end" className="justify-between">
        <span className="text-xs font-normal">{placeholder}</span>
        <InputGroupButton type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <FileUpIcon />
          Parcourir
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
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
          mark={stored.has(document.id) ? recordedPhrase(document.label) : undefined}
        >
          <SetupFileDrop
            id={document.fieldId}
            accept=".docx"
            placeholder="Déposer le DOCX"
            rejectTitle="Le document doit être un DOCX"
            matches={isDocx}
            onFile={(file) => onFile(file, document.id)}
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

export function SetupPanel({
  url,
  entryId,
  onBack
}: {
  url: string
  entryId: EntryId
  onBack: () => void
}) {
  const fieldId = useId()
  const [texts, setTexts] = useState<Record<string, string | null>>({})
  const [binaries, setBinaries] = useState<string[]>([])
  const [chatbotId, setChatbotId] = useState('default')
  const [newAgentId, setNewAgentId] = useState('')
  const [jsonDraft, setJsonDraft] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const proseReader = useRef<MarkdownReader | null>(null)
  const [jsonDirty, setJsonDirty] = useState(false)
  const seenProseKey = useRef('')
  const messageDrafts = useRef<string[] | null>(null)
  const [status, setStatus] = useState('Aucune modification')
  function editJson(value: string) {
    setJsonDirty(true)
    setJsonDraft(value)
    setStatus('Modifications à enregistrer')
  }
  const [saving, setSaving] = useState(false)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftSource, setDraftSource] = useState<{
    key: string
    texts: typeof texts
  } | null>(null)
  const entry = ENTRIES.find((item) => item.id === entryId) ?? ENTRIES[0]
  const jsonId = entryId === 'chatbots/default' ? `chatbots/${chatbotId}` : entry.json
  const proseId = entryId === 'chatbots/default' ? `chatbots/${chatbotId}/AGENTS.md` : entry.prose
  function noteProseEdit() {
    const key = `${proseId ?? ''}:${proseId ? storedText(texts, proseId).length : 0}`
    if (seenProseKey.current !== key) {
      seenProseKey.current = key
      return
    }
    setStatus('Modifications à enregistrer')
  }
  const chatbots = useMemo(() => {
    const ids = Object.keys(texts).filter((id) => /^chatbots\/[a-z0-9][a-z0-9_-]{0,63}$/.test(id))
    if (!ids.includes('chatbots/default')) ids.unshift('chatbots/default')
    const names = ids.map((id) => id.slice('chatbots/'.length))
    if (CHATBOT_ID.test(chatbotId) && !names.includes(chatbotId)) names.push(chatbotId)
    return names
  }, [chatbotId, texts])

  const sourceKey = `${jsonId ?? ''}\n${proseId ?? ''}`
  if (!draftSource || draftSource.key !== sourceKey || draftSource.texts !== texts) {
    const entryChanged = draftSource?.key !== sourceKey
    if (entryChanged && jsonDirty) setJsonDirty(false)
    setDraftSource({ key: sourceKey, texts })
    if (jsonId && (entryChanged || !jsonDirty)) {
      const stored = storedText(texts, jsonId)
      setJsonDraft(jsonId === 'tickets' ? ticketsConfigOrExample(stored) : stored)
    }
  }

  const showIcon =
    entryId === 'chatbots/default' && Boolean(url) && binaries.includes('chatbots/icons/icon.svg')
  if (!showIcon && iconUrl) setIconUrl(null)

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

  async function save() {
    setSaving(true)
    const errors: Record<string, string> = {}
    const written: Record<string, string> = {}
    const jobs: Array<[string, string]> = []
    if (jsonId === 'tickets') {
      const next = ticketsConfigOrExample(jsonDraft)
      if (next !== jsonDraft) {
        setJsonDirty(false)
        setJsonDraft(next)
      }
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
      setJsonDirty(false)
      setStatus('Enregistré')
      await load()
      await hydrateCustomizationFromServer(url)
      return
    }
    for (const message of messages) toast.add({ title: message, type: 'error' })
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

  function addAgent() {
    const id = newAgentId.trim()
    if (!CHATBOT_ID.test(id) || id === 'default') {
      toast.add({ title: 'Identifiant invalide', type: 'error' })
      return
    }
    setChatbotId(id)
    setJsonDraft('')
    setNewAgentId('')
    setStatus('Modifications à enregistrer')
  }

  async function removeAgent() {
    const response = await window.api?.deleteAdminChatbot?.({ url, id: chatbotId })
    setConfirmDelete(false)
    if (!response) {
      toast.add({ title: 'Suppression refusée', type: 'error' })
      return
    }
    setChatbotId('default')
    setStatus('Agent supprimé')
    await load()
  }

  const pieces = setupPieces(entryId, texts, binaries, chatbotId)

  const proseValue = proseId ? storedText(texts, proseId) : ''
  const proseError = proseId ? fieldErrors[proseId] : undefined

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
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
            <h1 className="font-serif text-4xl leading-tight font-normal">{entry.label}</h1>
          </div>
          {entryId === 'chatbots/default' ? (
            <Section id="setup-agent" title="Assistant">
              <Rows>
                <Row
                  title="Assistant"
                  description="default est ouvert aux locataires sur le site et dans Discuter. Un autre identifiant ne répond qu’aux collaborateurs auxquels on l’attribue."
                  htmlFor={`${fieldId}-agent`}
                >
                  <Select
                    items={chatbots.map((id) => ({
                      label: id === 'default' ? 'default · public' : `${id} · interne`,
                      value: id
                    }))}
                    value={chatbotId}
                    onValueChange={(next) => {
                      if (typeof next !== 'string') return
                      setChatbotId(next)
                      setStatus('Aucune modification')
                    }}
                  >
                    <SelectTrigger id={`${fieldId}-agent`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {chatbots.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id === 'default' ? 'default · public' : `${id} · interne`}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Row>
                <Row
                  title="Identifiant d’un nouvel agent"
                  description="Identifiant stable, qui ne se renomme pas. Le nom affiché se règle dans le JSON."
                  htmlFor={`${fieldId}-new-agent`}
                >
                  <div className="flex items-center gap-2">
                    <Input
                      id={`${fieldId}-new-agent`}
                      value={newAgentId}
                      placeholder="cadre-astreinte"
                      onChange={(event) => setNewAgentId(event.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={addAgent}>
                      Ajouter
                    </Button>
                  </div>
                </Row>
                {chatbotId !== 'default' ? (
                  <Row
                    title="Supprimer"
                    description={`L’agent ${chatbotId} et sa consigne seront supprimés.`}
                  >
                    <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}>
                      Supprimer
                    </Button>
                  </Row>
                ) : null}
              </Rows>
            </Section>
          ) : null}
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
              mark={storedName(pieces, proseId, 'Consigne')}
              description="Métier de l’agent : à qui il parle, quoi faire, quoi refuser. Les procédures et les exports se déposent dans l’encyclopédie."
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
              description={
                entryId === 'chatbots/default'
                  ? chatbotId === 'default'
                    ? 'Ouverture du chatbot public, nom affiché, phrase d’accueil et questions proposées. La consigne est le champ suivant.'
                    : 'Même réglage pour un agent absent du site. On l’attribue ensuite aux profils. La consigne est le champ suivant.'
                  : 'Paniers, actions et étiquettes du tableau des réclamations. La consigne est le champ suivant.'
              }
              example={entryId === 'tickets' ? TICKETS_JSON_EXAMPLE : undefined}
              value={jsonDraft}
              error={fieldErrors[jsonId]}
              onChange={editJson}
            />
          ) : null}
          {entryId !== 'repayment' && proseId ? (
            <ConsigneCard
              id={proseId}
              mark={storedName(pieces, proseId, 'Consigne')}
              description={
                entryId === 'about/AGENTS.md'
                  ? 'Texte suivi pour rédiger un briefing : quoi retenir, dans quel ordre, et quoi signaler s’il manque une donnée.'
                  : entryId === 'automations/AGENTS.md'
                    ? 'Texte suivi quand une automatisation rédige un rapport.'
                    : 'Métier de l’agent : à qui il parle, quoi faire, quoi refuser. Les procédures et les exports se déposent dans l’encyclopédie.'
              }
              value={proseValue}
              error={proseError}
              readerRef={proseReader}
              onEdit={noteProseEdit}
            />
          ) : null}
          {entryId === 'chatbots/default' && chatbotId === 'default' ? (
            <FileCard
              id="setup-icon"
              title="Icône"
              mark={storedName(pieces, 'chatbots/icons/icon.svg', 'Icône')}
              description="Dessin du chatbot public, sur le site et à l’installation sur téléphone. Un SVG suffit : les autres formats sont produits à l’enregistrement."
              preview={
                iconUrl ? (
                  <img
                    src={iconUrl}
                    alt="Icône enregistrée"
                    className="border-input bg-background h-8 w-auto max-w-48 shrink-0 rounded-md border object-contain p-0.5"
                  />
                ) : null
              }
              placeholder="Déposer votre icône ici"
              accept=".svg"
              rejectTitle="L’icône doit être un SVG"
              matches={isSvg}
              onFile={(file) => void upload(file, 'chatbots/icons/icon.svg')}
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
          <footer className="mt-2 flex items-center gap-2 py-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
              Enregistrer
            </Button>
            <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
              {status}
            </p>
          </footer>
        </div>
      </main>
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer l’agent"
        description={`L’agent ${chatbotId} et sa consigne seront supprimés.`}
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removeAgent()}
      />
    </div>
  )
}
