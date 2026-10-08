import { Circle, CircleCheck, FileUpIcon } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type RefObject
} from 'react'

import {
  PromptMarkdownEditor,
  type MarkdownReader
} from '@/features/automations/components/PromptMarkdownEditor'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import {
  BlockprintSuccessStateForTask,
  BlockprintWormGear
} from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field'
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
import { toast } from '@/shared/components/ui/toast'
import { filesFromDataTransfer, hasDraggedFiles } from '@/shared/lib/attachment-files'
import { consumeSetupRequest, useSetupRequest } from '@/shared/lib/open-setup'
import { cn } from '@/shared/lib/utils'

import { jsonSyntaxError, TICKETS_JSON_EXAMPLE } from './setup-json'
import { setupPieces } from './setup-pieces'

const ENTRIES = [
  {
    id: 'global',
    label: 'Général',
    json: 'global',
    prose: null,
    raw: null,
    file: null
  },
  {
    id: 'email',
    label: 'Email',
    json: null,
    prose: null,
    raw: 'email/html',
    file: 'email/logo.png'
  },
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

type EntryId = (typeof ENTRIES)[number]['id']

const REQUEST_ENTRY: Record<string, EntryId> = {
  chatbot: 'chatbots/default',
  tickets: 'tickets',
  repayment: 'repayment',
  about: 'about/AGENTS.md',
  automations: 'automations/AGENTS.md'
}

const CHATBOT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/

function storedText(texts: Record<string, string | null>, id: string): string {
  const stored = texts[id]
  return stored && stored.trim() ? stored : ''
}

function templateBody(texts: Record<string, string | null>, name: string): string {
  const stored = texts[`repayment/templates/${name}`]
  return stored && stored.trim() ? stored : ''
}

function isPng(file: File): boolean {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
}

function isSvg(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
}

function isDocx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.docx')
}

function JsonField({
  label,
  description,
  value,
  error,
  onChange
}: {
  label: string
  description: ReactNode
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field className="shrink-0" data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <textarea
        className="border-input field-sizing-content min-h-40 w-full rounded-lg border p-3 font-mono text-sm"
        value={value}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
}

function ConsigneField({
  id,
  label,
  description,
  value,
  error,
  readerRef
}: {
  id: string
  label: string
  description: string
  value: string
  error?: string
  readerRef: RefObject<MarkdownReader | null>
}) {
  return (
    <Field className="shrink-0" data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <PromptMarkdownEditor
        className="h-250 min-h-250"
        key={`${id}:${value.length}`}
        id={id}
        value={value}
        placeholder="AGENTS.md"
        readerRef={readerRef}
      />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
}

function DocxField({
  label,
  description,
  placeholder,
  onFile
}: {
  label: string
  description: string
  placeholder?: string
  onFile: (file: File) => void
}) {
  return (
    <Field className="shrink-0">
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <SetupFileDrop
        accept=".docx"
        placeholder={placeholder}
        rejectTitle="Le document doit être un DOCX"
        matches={isDocx}
        onFile={onFile}
      />
    </Field>
  )
}

function SetupFileDrop({
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

export function SetupPanel({ url }: { url: string }) {
  const request = useSetupRequest()
  const [texts, setTexts] = useState<Record<string, string | null>>({})
  const [binaries, setBinaries] = useState<string[]>([])
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<EntryId>('global')
  const [chatbotId, setChatbotId] = useState('default')
  const [newAgentId, setNewAgentId] = useState('')
  const [jsonDraft, setJsonDraft] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const proseReader = useRef<MarkdownReader | null>(null)
  const jsonDirty = useRef(false)
  function editJson(value: string) {
    jsonDirty.current = true
    setJsonDraft(value)
  }
  const [rawDraft, setRawDraft] = useState('')
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [templateDraft, setTemplateDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [appliedRequest, setAppliedRequest] = useState<typeof request>(null)
  const [draftSource, setDraftSource] = useState<{
    key: string
    texts: typeof texts
  } | null>(null)
  const [templateSource, setTemplateSource] = useState<{
    name: string
    texts: typeof texts
  } | null>(null)

  const entry = ENTRIES.find((item) => item.id === selected) ?? ENTRIES[0]
  const jsonId = selected === 'chatbots/default' ? `chatbots/${chatbotId}` : entry.json
  const proseId = selected === 'chatbots/default' ? `chatbots/${chatbotId}/AGENTS.md` : entry.prose
  const rawId = 'raw' in entry ? entry.raw : null

  const chatbots = useMemo(() => {
    const ids = Object.keys(texts).filter((id) => /^chatbots\/[a-z0-9][a-z0-9_-]{0,63}$/.test(id))
    if (!ids.includes('chatbots/default')) ids.unshift('chatbots/default')
    const names = ids.map((id) => id.slice('chatbots/'.length))
    if (CHATBOT_ID.test(chatbotId) && !names.includes(chatbotId)) names.push(chatbotId)
    return names
  }, [chatbotId, texts])

  const templateNames = useMemo(() => {
    if (selected !== 'repayment') return []
    try {
      const parsed = JSON.parse(jsonDraft) as { templates?: unknown }
      return Array.isArray(parsed.templates)
        ? parsed.templates.filter((name): name is string => typeof name === 'string')
        : []
    } catch {
      return []
    }
  }, [jsonDraft, selected])

  const sourceKey = `${jsonId ?? ''}\n${proseId ?? ''}\n${rawId ?? ''}`
  if (!draftSource || draftSource.key !== sourceKey || draftSource.texts !== texts) {
    const entryChanged = draftSource?.key !== sourceKey
    if (entryChanged) jsonDirty.current = false
    setDraftSource({ key: sourceKey, texts })
    if (jsonId && (entryChanged || !jsonDirty.current)) setJsonDraft(storedText(texts, jsonId))
    if (rawId) setRawDraft(storedText(texts, rawId))
  }

  if (request && request !== appliedRequest) {
    setAppliedRequest(request)
    const next = REQUEST_ENTRY[request]
    if (next) setSelected(next)
  }

  if (
    templateName &&
    (!templateSource || templateSource.name !== templateName || templateSource.texts !== texts)
  ) {
    setTemplateSource({ name: templateName, texts })
    setTemplateDraft(templateBody(texts, templateName))
  }

  const showLogo = selected === 'email' && Boolean(url) && binaries.includes('email/logo.png')
  const showIcon =
    selected === 'chatbots/default' && Boolean(url) && binaries.includes('chatbots/icons/icon.svg')
  if (!showLogo && logoUrl) setLogoUrl(null)
  if (!showIcon && iconUrl) setIconUrl(null)

  async function load() {
    const response = await window.api?.getAdminSetup?.({ url })
    if (!response) return
    setTexts(response.texts)
    setBinaries(response.binaries)
    setReady(response.ready ?? {})
  }

  useEffect(() => {
    if (!url) return
    let cancelled = false
    void (window.api?.getAdminSetup?.({ url }) ?? Promise.resolve(null)).then((response) => {
      if (cancelled || !response) return
      setTexts(response.texts)
      setBinaries(response.binaries)
      setReady(response.ready ?? {})
    })
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    if (request) consumeSetupRequest()
  }, [request])

  useEffect(() => {
    const read = window.api?.getSetupFile
    if (!showLogo || !read) return
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
  }, [binaries, showLogo, url])

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

  const emailPiecesReady = setupPieces('email', texts, binaries).every((item) => item.done)

  async function sendTestEmail() {
    setSendingTest(true)
    const response = await window.api?.postEmailTest?.({ url })
    setSendingTest(false)
    if (!response || response.error) {
      toast.add({ title: response?.error?.message ?? 'Envoi impossible', type: 'error' })
      return
    }
    toast.add({ title: 'Email de test envoyé', type: 'success' })
  }

  async function save() {
    setSaving(true)
    const errors: Record<string, string> = {}
    const written: Record<string, string> = {}
    const jobs: Array<[string, string]> = []
    if (jsonId) {
      const syntax = jsonSyntaxError(jsonDraft)
      if (syntax) errors[jsonId] = syntax
      else jobs.push([jsonId, jsonDraft])
    }
    if (proseId) jobs.push([proseId, proseReader.current?.read() ?? ''])
    if (rawId) jobs.push([rawId, rawDraft])
    for (const [id, body] of jobs) {
      const message = await putText(id, body)
      if (message) errors[id] = message
      else written[id] = body
    }
    setFieldErrors(errors)
    setSaving(false)
    const messages = Object.values(errors)
    if (messages.length === 0) {
      jsonDirty.current = false
      toast.add({ title: 'Enregistré', type: 'success' })
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
    toast.add({ title: 'Modèle enregistré', type: 'success' })
    await load()
  }

  async function upload(file: File, id: string) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const response = await window.api?.putAdminSetup?.({ url, id, bytes })
    if (!response?.data) {
      toast.add({ title: response?.error?.message ?? 'Téléversement refusé', type: 'error' })
      return
    }
    toast.add({ title: 'Téléversé', type: 'success' })
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
  }

  async function removeAgent() {
    const response = await window.api?.deleteAdminChatbot?.({ url, id: chatbotId })
    setConfirmDelete(false)
    if (!response) {
      toast.add({ title: 'Suppression refusée', type: 'error' })
      return
    }
    setChatbotId('default')
    toast.add({ title: 'Agent supprimé', type: 'success' })
    await load()
  }

  const pieces = setupPieces(selected, texts, binaries, chatbotId)

  return (
    <div className="flex min-h-0 flex-1">
      <ul className="border-input my-4 mr-4 ml-4 flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border">
        {ENTRIES.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-4 py-3 text-left text-sm',
                item.id === selected ? 'bg-muted' : 'hover:bg-muted'
              )}
              onClick={() => setSelected(item.id)}
            >
              {ready[item.id] ? (
                <BlockprintSuccessStateForTask className="size-4 shrink-0" />
              ) : (
                <BlockprintWormGear className="size-4 shrink-0" />
              )}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          <ul aria-label="Pièces" className="flex flex-col gap-2 rounded-md border p-3">
            {pieces.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CircleCheck
                    aria-hidden
                    className="text-pierre-debt-down size-4 shrink-0"
                    strokeWidth={1.5}
                  />
                ) : (
                  <Circle
                    aria-hidden
                    className="text-foreground size-4 shrink-0"
                    strokeWidth={1.5}
                  />
                )}
                {item.label}
              </li>
            ))}
          </ul>
          {selected === 'chatbots/default' ? (
            <>
              <Field>
                <FieldLabel>Agent</FieldLabel>
                <FieldDescription>
                  default est le chatbot public. Un autre identifiant est un agent interne, attribué
                  ensuite sur la fiche utilisateur.
                </FieldDescription>
                <div className="flex items-center gap-2">
                  <Select
                    items={chatbots.map((id) => ({
                      label: id === 'default' ? 'default · public' : `${id} · interne`,
                      value: id
                    }))}
                    value={chatbotId}
                    onValueChange={(next) => {
                      if (typeof next === 'string') setChatbotId(next)
                    }}
                  >
                    <SelectTrigger aria-label="Agent">
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
                  <Input
                    className="w-48"
                    value={newAgentId}
                    placeholder="cadre-astreinte"
                    onChange={(event) => setNewAgentId(event.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addAgent}>
                    Ajouter
                  </Button>
                  {chatbotId !== 'default' ? (
                    <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}>
                      Supprimer
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field className="shrink-0">
                <FieldLabel>Configuration de {chatbotId}</FieldLabel>
                <FieldDescription>
                  {chatbotId === 'default'
                    ? 'Chatbot public, exposé sur le site si enabled est true.'
                    : 'Agent interne. Il n’est pas public. On l’attribue sur la fiche utilisateur.'}{' '}
                  La consigne n’y figure pas. examples à null ou [] n’affiche aucun exemple.
                </FieldDescription>
                <textarea
                  className="border-input field-sizing-content min-h-40 w-full rounded-lg border p-3 font-mono text-sm"
                  value={jsonDraft}
                  spellCheck={false}
                  onChange={(event) => editJson(event.target.value)}
                />
                {jsonId && fieldErrors[jsonId] ? (
                  <FieldError errors={[{ message: fieldErrors[jsonId] }]} />
                ) : null}
              </Field>
              <Field className="shrink-0">
                <FieldLabel>Consigne de {chatbotId}</FieldLabel>
                <FieldDescription>Fichier lu par Pi au démarrage.</FieldDescription>
                <div>
                  <PromptMarkdownEditor
                    className="h-250 min-h-250"
                    key={`${proseId}:${storedText(texts, proseId ?? '').length}`}
                    id={proseId ?? 'chatbots/default/AGENTS.md'}
                    value={storedText(texts, proseId ?? '')}
                    placeholder="AGENTS.md"
                    readerRef={proseReader}
                  />
                </div>
                {proseId && fieldErrors[proseId] ? (
                  <FieldError errors={[{ message: fieldErrors[proseId] }]} />
                ) : null}
              </Field>
              {chatbotId === 'default' ? (
                <Field className="shrink-0">
                  <FieldLabel>Icône d’installation sur téléphone</FieldLabel>
                  <FieldDescription>
                    Un seul SVG, commun au chatbot public. Les PNG et le manifeste sont dérivés à
                    l’enregistrement.
                  </FieldDescription>
                  <div className="flex items-center gap-3">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt="Icône enregistrée"
                        className="border-input bg-background h-8 w-auto max-w-48 shrink-0 border object-contain p-0.5"
                      />
                    ) : null}
                    <SetupFileDrop
                      className="w-auto min-w-0 flex-1"
                      accept=".svg"
                      placeholder="Déposer votre icône ici"
                      rejectTitle="L’icône doit être un SVG"
                      matches={isSvg}
                      onFile={(file) => void upload(file, 'chatbots/icons/icon.svg')}
                    />
                  </div>
                </Field>
              ) : null}
            </>
          ) : null}
          {selected === 'global' ? (
            <JsonField
              label="Configuration"
              description="Nom de l’agent et fuseau horaire de l’instance. Le fuseau s’applique à toute l’instance."
              value={jsonDraft}
              error={jsonId ? fieldErrors[jsonId] : undefined}
              onChange={editJson}
            />
          ) : null}
          {selected === 'tickets' ? (
            <>
              <JsonField
                label="Configuration"
                description={
                  <>
                    Paniers, actions et étiquettes. La consigne n’y figure pas. Le JSON doit
                    contenir buckets (id non_traitees), actions.dossier et tags.
                    <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">
                      {TICKETS_JSON_EXAMPLE}
                    </pre>
                  </>
                }
                value={jsonDraft}
                error={jsonId ? fieldErrors[jsonId] : undefined}
                onChange={editJson}
              />
              <ConsigneField
                id="tickets/AGENTS.md"
                label="Consigne"
                description="Fichier lu par Pi au démarrage."
                value={storedText(texts, 'tickets/AGENTS.md')}
                error={proseId ? fieldErrors[proseId] : undefined}
                readerRef={proseReader}
              />
              <DocxField
                label="Courrier Word"
                description="Modèle letter.docx des courriers de réclamation."
                placeholder="Déposer votre courrier ici"
                onFile={(file) => void upload(file, 'tickets/letter.docx')}
              />
            </>
          ) : null}
          {selected === 'repayment' ? (
            <>
              <JsonField
                label="Configuration"
                description="Paniers, actions, étiquettes et plans. La consigne n’y figure pas. templates liste les modèles à éditer."
                value={jsonDraft}
                error={jsonId ? fieldErrors[jsonId] : undefined}
                onChange={editJson}
              />
              <ConsigneField
                id="repayment/AGENTS.md"
                label="Consigne"
                description="Fichier lu par Pi au démarrage."
                value={storedText(texts, 'repayment/AGENTS.md')}
                error={proseId ? fieldErrors[proseId] : undefined}
                readerRef={proseReader}
              />
              <DocxField
                label="Courrier du plan"
                description="Modèle template.docx du courrier de plan d’apurement."
                placeholder="Déposer le courrier du plan ici"
                onFile={(file) => void upload(file, 'repayment/template.docx')}
              />
              {templateNames.length > 0 ? (
                <Field className="shrink-0">
                  <FieldLabel>Modèle</FieldLabel>
                  <FieldDescription>
                    Un fichier listé dans templates. Un .md est le texte du message, un .json un
                    message structuré.
                  </FieldDescription>
                  <Select
                    items={templateNames.map((name) => ({ label: name, value: name }))}
                    value={templateName}
                    onValueChange={(next) => {
                      if (typeof next === 'string') setTemplateName(next)
                    }}
                  >
                    <SelectTrigger aria-label="Modèle">
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
                      className="h-250 min-h-250"
                      key={`${templateName}:${templateBody(texts, templateName).length}`}
                      id={`repayment/templates/${templateName}`}
                      value={templateBody(texts, templateName)}
                      placeholder="Modèle"
                      onChange={setTemplateDraft}
                    />
                  ) : null}
                  {templateName && !templateName.endsWith('.md') ? (
                    <textarea
                      className="border-input field-sizing-content min-h-40 w-full rounded-lg border p-3 font-mono text-sm"
                      value={templateDraft}
                      spellCheck={false}
                      onChange={(event) => setTemplateDraft(event.target.value)}
                    />
                  ) : null}
                  {templateName ? (
                    <Button type="button" variant="outline" onClick={() => void saveTemplate()}>
                      Enregistrer le modèle
                    </Button>
                  ) : null}
                </Field>
              ) : null}
            </>
          ) : null}
          {selected === 'about/AGENTS.md' ? (
            <ConsigneField
              id="about/AGENTS.md"
              label="Consigne"
              description="Fichier lu par Pi au démarrage pour réaliser une synthèse."
              value={storedText(texts, 'about/AGENTS.md')}
              error={proseId ? fieldErrors[proseId] : undefined}
              readerRef={proseReader}
            />
          ) : null}
          {selected === 'automations/AGENTS.md' ? (
            <ConsigneField
              id="automations/AGENTS.md"
              label="Consigne"
              description="Fichier lu par Pi au démarrage pour générer un rapport."
              value={storedText(texts, 'automations/AGENTS.md')}
              error={proseId ? fieldErrors[proseId] : undefined}
              readerRef={proseReader}
            />
          ) : null}
          {rawId ? (
            <>
              <Field className="min-h-40 flex-1">
                <FieldLabel>Template HTML des emails transactionnels</FieldLabel>
                <FieldDescription>
                  Ne pas modifier {'{{ logo_inline_cid }}'} et {'{{ message }}'}. Modifier par
                  contre la largeur de votre logo pour être en cohérence avec sa forme (n'hésitez
                  pas à faire des tests), la signature et le pied de page.
                </FieldDescription>
                <textarea
                  className="border-input field-sizing-content min-h-40 w-full rounded-lg border p-3 font-mono text-sm"
                  value={rawDraft}
                  spellCheck={false}
                  onChange={(event) => setRawDraft(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Le logo de votre organisme</FieldLabel>
                <FieldDescription>
                  Le logo doit impérativement être un PNG transparent, bord à bord.
                </FieldDescription>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo enregistré"
                      className="border-input bg-background h-8 w-auto max-w-48 shrink-0 border object-contain p-0.5"
                    />
                  ) : null}
                  <SetupFileDrop
                    className="w-auto min-w-0 flex-1"
                    accept=".png"
                    placeholder="Déposer votre logo ici"
                    rejectTitle="Le logo doit être un PNG"
                    matches={isPng}
                    onFile={(file) => {
                      if (entry.file) void upload(file, entry.file)
                    }}
                  />
                </div>
              </Field>
            </>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              Enregistrer
            </Button>
            {selected === 'email' ? (
              <Button
                type="button"
                variant="outline"
                disabled={!emailPiecesReady || sendingTest}
                onClick={() => void sendTestEmail()}
              >
                Envoyer un email de test
              </Button>
            ) : null}
          </div>
        </div>
      </div>
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
