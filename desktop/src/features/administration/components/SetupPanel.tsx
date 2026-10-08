import { ArrowLeft, Circle, CircleCheck, FileUpIcon } from 'lucide-react'
import {
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
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

import { jsonSyntaxError, TICKETS_JSON_EXAMPLE, ticketsConfigOrExample } from './setup-json'
import { type SetupPiece, setupPieces } from './setup-pieces'

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
    file: 'repayment/template.docx'
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

function templateBody(texts: Record<string, string | null>, name: string): string {
  const stored = texts[`repayment/templates/${name}`]
  return stored && stored.trim() ? stored : ''
}

function isSvg(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

function isDocx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.docx')
}

function recordedWord(label: string): string {
  if (label === 'Courrier' || label.startsWith('Modèle')) return 'enregistré'
  return 'enregistrée'
}

export function SetupChecklist({ pieces }: { pieces: SetupPiece[] }) {
  const done = pieces.filter((item) => item.done).length
  return (
    <section aria-labelledby="setup-progress">
      <Card>
        <CardHeader>
          <CardTitle id="setup-progress">Avancement</CardTitle>
          <CardAction>
            <span className="text-muted-foreground text-xs leading-4 tabular-nums">
              {done} sur {pieces.length}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {pieces.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                ) : (
                  <Circle aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                )}
                {item.label}
                <span className="sr-only">
                  , {item.done ? recordedWord(item.label) : 'à faire'}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <Card>
        <CardHeader>
          <CardTitle id={id}>{title}</CardTitle>
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

function JsonCard({
  id,
  description,
  example,
  value,
  error,
  onChange
}: {
  id: string
  description: string
  example?: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Section id={id} title="Configuration">
      <Field data-invalid={error ? true : undefined}>
        <FieldDescription>{description}</FieldDescription>
        {example ? <pre className="font-mono text-xs whitespace-pre-wrap">{example}</pre> : null}
        <Textarea
          className="max-h-96 font-mono"
          value={value}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {error ? <FieldError errors={[{ message: error }]} /> : null}
      </Field>
    </Section>
  )
}

function ConsigneCard({
  id,
  description,
  value,
  error,
  readerRef,
  onEdit
}: {
  id: string
  description: string
  value: string
  error?: string
  readerRef: RefObject<MarkdownReader | null>
  onEdit: () => void
}) {
  return (
    <Section id="setup-consigne" title="Consigne">
      <Field data-invalid={error ? true : undefined}>
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
    </Section>
  )
}

function FileCard({
  id,
  title,
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
  description: string
  preview?: ReactNode
  placeholder: string
  accept: string
  rejectTitle: string
  matches: (file: File) => boolean
  onFile: (file: File) => void
}) {
  return (
    <Section id={id} title={title}>
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
  className,
  accept,
  placeholder = 'Déposez des fichiers ici',
  rejectTitle,
  matches,
  onFile
}: {
  className?: string
  accept: string
  placeholder?: string
  rejectTitle: string
  matches: (file: File) => boolean
  onFile: (file: File) => void
}) {
  const inputId = useId()
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
  const seenTemplateKey = useRef('')
  const [status, setStatus] = useState('Aucune modification')
  function editJson(value: string) {
    setJsonDirty(true)
    setJsonDraft(value)
    setStatus('Modifications à enregistrer')
  }
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [templateDraft, setTemplateDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftSource, setDraftSource] = useState<{
    key: string
    texts: typeof texts
  } | null>(null)
  const [templateSource, setTemplateSource] = useState<{
    name: string
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
  function noteTemplateEdit(value: string) {
    setTemplateDraft(value)
    const key = `${templateName ?? ''}:${templateName ? templateBody(texts, templateName).length : 0}`
    if (seenTemplateKey.current !== key) {
      seenTemplateKey.current = key
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

  const templateNames = useMemo(() => {
    if (entryId !== 'repayment') return []
    try {
      const parsed = JSON.parse(jsonDraft) as { templates?: unknown }
      return Array.isArray(parsed.templates)
        ? parsed.templates.filter((name): name is string => typeof name === 'string')
        : []
    } catch {
      return []
    }
  }, [jsonDraft, entryId])

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

  if (
    templateName &&
    (!templateSource || templateSource.name !== templateName || templateSource.texts !== texts)
  ) {
    setTemplateSource({ name: templateName, texts })
    setTemplateDraft(templateBody(texts, templateName))
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
      return
    }
    for (const message of messages) toast.add({ title: message, type: 'error' })
    if (Object.keys(written).length > 0) setTexts((current) => ({ ...current, ...written }))
  }

  async function saveTemplate() {
    if (!templateName) return
    const message = await putText(`repayment/templates/${templateName}`, templateDraft)
    if (message) {
      toast.add({ title: message, type: 'error' })
      return
    }
    setStatus('Modèle enregistré')
    await load()
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
          <SetupChecklist pieces={pieces} />
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
          {jsonId ? (
            <JsonCard
              id="setup-configuration"
              description={
                entryId === 'chatbots/default'
                  ? chatbotId === 'default'
                    ? 'Ouverture du chatbot public, nom affiché, phrase d’accueil et questions proposées. La consigne est le champ suivant.'
                    : 'Même réglage pour un agent absent du site. On l’attribue ensuite aux profils. La consigne est le champ suivant.'
                  : entryId === 'tickets'
                    ? 'Paniers, actions et étiquettes du tableau des réclamations. La consigne est le champ suivant.'
                    : 'Paniers, actions et étiquettes du tableau des impayés, et la liste des modèles de messages. La consigne est le champ suivant.'
              }
              example={entryId === 'tickets' ? TICKETS_JSON_EXAMPLE : undefined}
              value={jsonDraft}
              error={fieldErrors[jsonId]}
              onChange={editJson}
            />
          ) : null}
          {proseId ? (
            <ConsigneCard
              id={proseId}
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
              description="Modèle Word des courriers de réclamation."
              placeholder="Déposer votre courrier ici"
              accept=".docx"
              rejectTitle="Le document doit être un DOCX"
              matches={isDocx}
              onFile={(file) => void upload(file, 'tickets/letter.docx')}
            />
          ) : null}
          {entryId === 'repayment' ? (
            <FileCard
              id="setup-plan-letter"
              title="Courrier"
              description="Modèle Word du courrier de plan d’apurement."
              placeholder="Déposer le courrier du plan ici"
              accept=".docx"
              rejectTitle="Le document doit être un DOCX"
              matches={isDocx}
              onFile={(file) => void upload(file, 'repayment/template.docx')}
            />
          ) : null}
          {entryId === 'repayment' && templateNames.length > 0 ? (
            <Section id="setup-templates" title="Modèles">
              <Field>
                <FieldDescription>
                  Messages de relance listés dans la configuration. Un fichier .md est le texte, un
                  .json un message structuré.
                </FieldDescription>
                <Select
                  items={templateNames.map((name) => ({ label: name, value: name }))}
                  value={templateName}
                  onValueChange={(next) => {
                    if (typeof next === 'string') setTemplateName(next)
                  }}
                >
                  <SelectTrigger id={`${fieldId}-template`} className="w-full" aria-label="Modèle">
                    <SelectValue placeholder="Choisir un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {templateNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {templateName?.endsWith('.md') ? (
                  <PromptMarkdownEditor
                    className="h-96 max-h-96"
                    key={`${templateName}:${templateBody(texts, templateName).length}`}
                    id={`repayment/templates/${templateName}`}
                    value={templateBody(texts, templateName)}
                    placeholder="Modèle"
                    onChange={noteTemplateEdit}
                  />
                ) : null}
                {templateName && !templateName.endsWith('.md') ? (
                  <Textarea
                    className="max-h-96 font-mono"
                    value={templateDraft}
                    spellCheck={false}
                    onChange={(event) => {
                      setTemplateDraft(event.target.value)
                      setStatus('Modifications à enregistrer')
                    }}
                  />
                ) : null}
                {templateName ? (
                  <Button type="button" variant="outline" onClick={() => void saveTemplate()}>
                    Enregistrer le modèle
                  </Button>
                ) : null}
              </Field>
            </Section>
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
