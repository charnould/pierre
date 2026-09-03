import { FileUpIcon } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent
} from 'react'

import { PromptMarkdownEditor } from '@/features/automations/components/PromptMarkdownEditor'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import {
  BlockprintSuccessStateForTask,
  BlockprintWormGear
} from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
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

import { defaultSetupText, internalChatbotText } from './setup-defaults'

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

function storedOrDefault(texts: Record<string, string | null>, id: string): string {
  const stored = texts[id]
  return stored && stored.trim() ? stored : defaultSetupText(id)
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
  onChange
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field className="shrink-0">
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <textarea
        className="border-input field-sizing-content min-h-40 w-full rounded-lg border p-3 font-mono text-sm"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function ConsigneField({
  id,
  label,
  description,
  value,
  onChange
}: {
  id: string
  label: string
  description: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field className="shrink-0">
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <PromptMarkdownEditor
        className="h-250 min-h-250"
        key={`${id}:${value.length}`}
        id={id}
        value={value}
        placeholder="AGENTS.md"
        onChange={onChange}
      />
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
  const [proseDraft, setProseDraft] = useState('')
  const [rawDraft, setRawDraft] = useState('')
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [templateDraft, setTemplateDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const entry = ENTRIES.find((item) => item.id === selected) ?? ENTRIES[0]
  const jsonId = selected === 'chatbots/default' ? `chatbots/${chatbotId}` : entry.json
  const proseId = selected === 'chatbots/default' ? `chatbots/${chatbotId}/AGENTS.md` : entry.prose
  const rawId = 'raw' in entry ? entry.raw : null

  const chatbots = useMemo(() => {
    const ids = Object.keys(texts).filter((id) => /^chatbots\/[a-z0-9][a-z0-9_-]{0,63}$/.test(id))
    if (!ids.includes('chatbots/default')) ids.unshift('chatbots/default')
    return ids.map((id) => id.slice('chatbots/'.length))
  }, [texts])

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

  async function load() {
    const response = await window.api?.getAdminSetup?.({ url })
    if (!response) return
    setTexts(response.texts)
    setBinaries(response.binaries)
    setReady(response.ready ?? {})
  }

  useEffect(() => {
    if (!url) return
    void load()
  }, [url, load])

  useEffect(() => {
    if (!request) return
    const next = REQUEST_ENTRY[request]
    if (next) setSelected(next)
    consumeSetupRequest()
  }, [request])

  useEffect(() => {
    if (jsonId) setJsonDraft(storedOrDefault(texts, jsonId))
    if (proseId) setProseDraft(storedOrDefault(texts, proseId))
    if (rawId) setRawDraft(storedOrDefault(texts, rawId))
  }, [jsonId, proseId, rawId, texts])

  useEffect(() => {
    const read = window.api?.getSetupFile
    if (selected !== 'email' || !url || !read || !binaries.includes('email/logo.png')) {
      setLogoUrl(null)
      return
    }
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
  }, [binaries, selected, url])

  useEffect(() => {
    const read = window.api?.getSetupFile
    if (
      selected !== 'chatbots/default' ||
      !url ||
      !read ||
      !binaries.includes('chatbots/icons/icon.svg')
    ) {
      setIconUrl(null)
      return
    }
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
  }, [binaries, selected, url])

  useEffect(() => {
    if (!templateName) return
    const stored = texts[`repayment/templates/${templateName}`]
    setTemplateDraft(stored && stored.trim() ? stored : '')
  }, [templateName, texts])

  async function putText(id: string, body: string) {
    const response = await window.api?.putAdminSetup?.({ url, id, body })
    if (!response) {
      toast.add({ title: 'Enregistrement refusé', type: 'error' })
      return false
    }
    return true
  }

  async function save() {
    setSaving(true)
    const ok =
      (jsonId
        ? await putText(jsonId, jsonDraft || (jsonId ? storedOrDefault(texts, jsonId) : ''))
        : true) &&
      (proseId ? await putText(proseId, proseDraft || storedOrDefault(texts, proseId)) : true) &&
      (rawId ? await putText(rawId, rawDraft || storedOrDefault(texts, rawId)) : true)
    setSaving(false)
    if (!ok) return
    toast.add({ title: 'Enregistré', type: 'success' })
    await load()
  }

  async function saveTemplate() {
    if (!templateName) return
    if (await putText(`repayment/templates/${templateName}`, templateDraft)) {
      toast.add({ title: 'Modèle enregistré', type: 'success' })
      await load()
    }
  }

  async function upload(file: File, id: string) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const response = await window.api?.putAdminSetup?.({ url, id, bytes })
    if (!response) {
      toast.add({ title: 'Téléversement refusé', type: 'error' })
      return
    }
    toast.add({ title: 'Téléversé', type: 'success' })
    await load()
  }

  async function addAgent() {
    const body = internalChatbotText(newAgentId)
    if (!body) {
      toast.add({ title: 'Identifiant invalide', type: 'error' })
      return
    }
    const id = newAgentId.trim()
    if (!(await putText(`chatbots/${id}`, body))) return
    if (
      !(await putText(`chatbots/${id}/AGENTS.md`, defaultSetupText('chatbots/default/AGENTS.md')))
    )
      return
    setChatbotId(id)
    setNewAgentId('')
    toast.add({ title: 'Agent ajouté', type: 'success' })
    await load()
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
                  <Button type="button" variant="outline" onClick={() => void addAgent()}>
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
                  onChange={(event) => setJsonDraft(event.target.value)}
                />
              </Field>
              <Field className="shrink-0">
                <FieldLabel>Consigne de {chatbotId}</FieldLabel>
                <FieldDescription>Fichier lu par Pi au démarrage.</FieldDescription>
                <div>
                  <PromptMarkdownEditor
                    className="h-250 min-h-250"
                    key={`${proseId}:${storedOrDefault(texts, proseId ?? '').length}`}
                    id={proseId ?? 'chatbots/default/AGENTS.md'}
                    value={storedOrDefault(texts, proseId ?? '')}
                    placeholder="AGENTS.md"
                    onChange={setProseDraft}
                  />
                </div>
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
              onChange={setJsonDraft}
            />
          ) : null}
          {selected === 'tickets' ? (
            <>
              <JsonField
                label="Configuration"
                description="Paniers, actions et étiquettes. La consigne n’y figure pas."
                value={jsonDraft}
                onChange={setJsonDraft}
              />
              <ConsigneField
                id="tickets/AGENTS.md"
                label="Consigne"
                description="Fichier lu par Pi au démarrage."
                value={storedOrDefault(texts, 'tickets/AGENTS.md')}
                onChange={setProseDraft}
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
                onChange={setJsonDraft}
              />
              <ConsigneField
                id="repayment/AGENTS.md"
                label="Consigne"
                description="Fichier lu par Pi au démarrage."
                value={storedOrDefault(texts, 'repayment/AGENTS.md')}
                onChange={setProseDraft}
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
              value={storedOrDefault(texts, 'about/AGENTS.md')}
              onChange={setProseDraft}
            />
          ) : null}
          {selected === 'automations/AGENTS.md' ? (
            <ConsigneField
              id="automations/AGENTS.md"
              label="Consigne"
              description="Fichier lu par Pi au démarrage pour générer un rapport."
              value={storedOrDefault(texts, 'automations/AGENTS.md')}
              onChange={setProseDraft}
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
                disabled={!texts['email/html']?.trim() || !binaries.includes('email/logo.png')}
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
