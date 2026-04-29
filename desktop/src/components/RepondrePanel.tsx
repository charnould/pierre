import { Loader2 } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import type { Settings } from '../types'

interface Props {
  hidden: boolean
  settings: Settings
  clipboard: string
  clipboardKey: number
}

interface FileEntry {
  name: string
  size: number
  file: File
}

interface Skill {
  id: string
  display: string
}

export function RepondrePanel({ hidden, settings, clipboard, clipboardKey }: Props) {
  const [editableClipboard, setEditableClipboard] = useState(clipboard)
  const [context, setContext] = useState('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [result, setResult] = useState('')
  const [hasResult, setHasResult] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showActionBar, setShowActionBar] = useState(false)
  const [btnLabel, setBtnLabel] = useState('Générer la réponse')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkill, setSelectedSkill] = useState('skill_answer')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const convIdRef = useRef(crypto.randomUUID())
  const isGeneratingRef = useRef(false)
  const editableClipboardRef = useRef(editableClipboard)
  const contextRef = useRef(context)
  const feedbackRef = useRef(feedback)
  const settingsUrlRef = useRef(settings.url)
  const filesRef = useRef(files)
  const selectedSkillRef = useRef(selectedSkill)

  useEffect(() => {
    editableClipboardRef.current = editableClipboard
  }, [editableClipboard])
  useEffect(() => {
    contextRef.current = context
  }, [context])
  useEffect(() => {
    feedbackRef.current = feedback
  }, [feedback])
  useEffect(() => {
    settingsUrlRef.current = settings.url
  }, [settings.url])
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => {
    selectedSkillRef.current = selectedSkill
  }, [selectedSkill])

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0)
      return
    }
    setElapsedSeconds(0)
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isGenerating])

  // Sync editable clipboard when the clipboard prop changes (unless generating)
  useEffect(() => {
    if (!isGeneratingRef.current) setEditableClipboard(clipboard)
  }, [clipboard])

  // Load skills from the server when url becomes available
  useEffect(() => {
    const url = settings.url
    if (!url) return
    void (async () => {
      const list = await window.api.getSkills({ url })
      if (Array.isArray(list) && list.length > 0) {
        setSkills(list as Skill[])
        setSelectedSkill(list[0].id as string)
      }
    })()
  }, [settings.url])

  // Reset state when clipboard changes; skip initial render
  const isFirstClipboard = useRef(true)
  useEffect(() => {
    if (isFirstClipboard.current) {
      isFirstClipboard.current = false
      return
    }
    if (isGeneratingRef.current) return
    convIdRef.current = crypto.randomUUID()
    setResult('')
    setHasResult(false)
    setContext('')
    setFiles([])
    setFeedback('')
    setShowActionBar(false)
    setBtnLabel('Générer la réponse')
  }, [clipboardKey])

  function finalize(content: string) {
    isGeneratingRef.current = false
    setResult(content)
    setIsGenerating(false)
    setHasResult(true)
    setShowActionBar(true)
    setBtnLabel('Regénérer la réponse')
  }

  function onError(msg: string) {
    isGeneratingRef.current = false
    setIsGenerating(false)
    if (!hasResult) setBtnLabel('Réessayer')
    if (msg) {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  const generate = useCallback(async (isRegen = false) => {
    if (isGeneratingRef.current) return
    const url = settingsUrlRef.current
    if (!url) return

    const message = isRegen
      ? feedbackRef.current.trim() || 'Améliore la réponse précédente.'
      : editableClipboardRef.current

    const ctx = isRegen ? '' : contextRef.current.trim()

    if (!isRegen && !editableClipboardRef.current) return

    isGeneratingRef.current = true
    setIsGenerating(true)

    if (isRegen) {
      setBtnLabel('Génération…')
    } else {
      setBtnLabel('Génération…')
      setResult('')
      setShowActionBar(false)
    }

    try {
      const fileEntries = filesRef.current
      const filesPayload = await Promise.all(
        fileEntries.map(async (f) => ({
          name: f.name,
          type: f.file.type || 'application/octet-stream',
          buffer: await readFileAsBuffer(f.file)
        }))
      )

      const r = await window.api.generateAnswer({
        url,
        conv_id: convIdRef.current,
        message,
        context: ctx,
        skill: selectedSkillRef.current,
        files: filesPayload
      })

      if (!isGeneratingRef.current) return

      if ('error' in r) {
        onError('Une erreur est survenue lors de la génération.')
      } else {
        finalize(r.content as string)
      }
    } catch {
      onError('Une erreur est survenue lors de la génération.')
    }
  }, [])

  // Keyboard shortcut: Cmd/Ctrl+Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void generate(hasResult)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [generate, hasResult])

  function addFiles(newFiles: File[]) {
    setFiles((prev) => {
      const next = [...prev]
      for (const f of newFiles) {
        if (!next.some((c) => c.name === f.name && c.size === f.size)) {
          next.push({ name: f.name, size: f.size, file: f })
        }
      }
      return next
    })
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function copyToClipboard() {
    await window.api.writeClipboard(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function resetAll() {
    convIdRef.current = crypto.randomUUID()
    setEditableClipboard('')
    setContext('')
    setFiles([])
    setResult('')
    setHasResult(false)
    setFeedback('')
    setShowActionBar(false)
    setBtnLabel('Générer la réponse')
    setErrorMsg('')
  }

  return (
    <div className={`tab-panel min-h-0 flex-1 flex-col ${hidden ? 'hidden' : 'flex'}`}>
      <main className="bg-background flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <section className="flex shrink-0 flex-col gap-2">
          <Label className="text-muted-foreground text-[12px] font-semibold tracking-wide uppercase">
            Contexte
          </Label>

          <Textarea
            value={editableClipboard}
            onChange={(e) => setEditableClipboard(e.target.value)}
            placeholder={
              'Le texte placé dans le presse-papier apparaît ici.\nPensez à utiliser CTRL + C.'
            }
            className="bg-muted/30 min-h-22.5 resize-none border-dashed text-[13px]"
          />

          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Facultatif · Contexte complémentaire"
            className="bg-muted/30 resize-none border-dashed text-[13px]"
          />

          <DropZone onFiles={addFiles} />

          {files.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${f.size}`}
                  className="border-border bg-muted/30 text-muted-foreground flex items-center justify-between rounded-md border px-2.5 py-1 text-[11px]"
                >
                  <span className="flex-1 truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground/60 hover:text-destructive ml-2 cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-h-45 flex-1 flex-col gap-2">
          <Label className="text-muted-foreground text-[12px] font-semibold tracking-wide uppercase">
            Proposition de réponse
          </Label>
          <Textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="flex-1 resize-none text-[14px]"
          />
        </section>
      </main>

      <footer className="border-border flex shrink-0 flex-col gap-1.5 border-t px-4 pt-2 pb-4">
        {skills.length > 1 && (
          <Select value={selectedSkill} onValueChange={setSelectedSkill} disabled={isGenerating}>
            <SelectTrigger className="w-full text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {skills.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-[12px]">
                  {s.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showActionBar && (
          <Button
            onClick={() => void copyToClipboard()}
            className="w-full py-5 text-[13px] font-bold tracking-wide"
          >
            {copied ? '✓ Copié' : 'Copier dans le presse-papiers'}
          </Button>
        )}

        {hasResult && (
          <Input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="ex : plus détaillé, plus précis…"
            className="text-[13px]"
          />
        )}

        {hasResult ? (
          <div className="flex gap-1.5">
            <Button
              onClick={() => void generate(true)}
              disabled={isGenerating}
              variant="outline"
              className="flex-1 gap-2 text-[12px] font-semibold"
            >
              {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isGenerating ? `Génération… ${elapsedSeconds}s` : 'Regénérer la réponse'}
            </Button>
            <Button
              variant="outline"
              onClick={resetAll}
              disabled={isGenerating}
              className="text-[12px]"
            >
              Effacer
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => void generate(false)}
            disabled={isGenerating}
            className="w-full gap-2 py-5 text-[13px] font-bold"
          >
            {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isGenerating ? `Génération… ${elapsedSeconds}s` : btnLabel}
          </Button>
        )}

        {errorMsg && <p className="text-destructive mt-1 text-center text-[11px]">{errorMsg}</p>}
      </footer>
    </div>
  )
}

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files))
      }}
      className={`border-input bg-muted/30 text-muted-foreground cursor-pointer rounded-lg border border-dashed px-3.5 py-2 text-[13px] transition-colors ${dragging ? 'border-ring bg-muted' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) {
            onFiles(Array.from(e.target.files))
            e.target.value = ''
          }
        }}
      />
      Facultatif · Parcourir ou déposer des PDF
    </div>
  )
}
