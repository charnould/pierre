import { ClipboardCopy, FileText, Info, Loader2, Upload } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import type { Settings } from '../types'
import { AsciiBackground } from './AsciiBackground'

interface Props {
  hidden: boolean
  settings: Settings
}

interface FileEntry {
  name: string
  size: number
  file: File
}

export function RepondrePanel({ hidden, settings }: Props) {
  const [editableClipboard, setEditableClipboard] = useState('')
  const [context, setContext] = useState('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [result, setResult] = useState('')
  const [displayedResult, setDisplayedResult] = useState('')
  const [hasResult, setHasResult] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const convIdRef = useRef(crypto.randomUUID())
  const isGeneratingRef = useRef(false)
  const editableClipboardRef = useRef(editableClipboard)
  const contextRef = useRef(context)
  const feedbackRef = useRef(feedback)
  const settingsUrlRef = useRef(settings.url)
  const filesRef = useRef(files)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    if (!isGenerating) {
      setElapsedSeconds(0)
      return
    }
    setElapsedSeconds(0)
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isGenerating])

  // Typewriter effect: animate displayedResult when result changes
  useEffect(() => {
    if (!result) {
      setDisplayedResult('')
      return
    }
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    let i = 0
    const CHUNK = 18
    setDisplayedResult('')
    typewriterRef.current = setInterval(() => {
      i += CHUNK
      if (i >= result.length) {
        setDisplayedResult(result)
        clearInterval(typewriterRef.current!)
        typewriterRef.current = null
      } else {
        setDisplayedResult(result.slice(0, i))
      }
    }, 16)
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current)
    }
  }, [result])

  function finalize(content: string) {
    isGeneratingRef.current = false
    setResult(content)
    setIsGenerating(false)
    setHasResult(true)
  }

  function onError(msg: string) {
    isGeneratingRef.current = false
    setIsGenerating(false)
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
    if (!isRegen) {
      setResult('')
      setDisplayedResult('')
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
        skill: 'answer',
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
        if (!next.some((c) => c.name === f.name && c.size === f.size))
          next.push({ name: f.name, size: f.size, file: f })
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
    setDisplayedResult('')
    setHasResult(false)
    setFeedback('')
    setErrorMsg('')
  }

  return (
    <div className={`tab-panel min-h-0 flex-1 flex-col ${hidden ? 'hidden' : 'flex'}`}>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* ── LEFT PANEL : inputs ── */}
        <ResizablePanel defaultSize={39} className="flex flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Contexte principal — grows to fill all available space */}
            <div className="flex min-h-0 flex-1 flex-col border-b border-gray-300 px-4 py-4">
              <FieldBlock
                className="min-h-0 flex-1"
                label="Contexte principal"
                hint="Il peut s’agir d’un email, d’un message de l’agence virtuelle, ou d’un courrier manuscrit.
              Le contexte principal peut inclure du texte seul, des pièces jointes seules, ou les deux."
              >
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <Textarea
                    value={editableClipboard}
                    onChange={(e) => setEditableClipboard(e.target.value)}
                    placeholder={'Pensez à utiliser CTRL+C et CTRL+V'}
                    className="min-h-0 flex-[2_1_0%] resize-none border-gray-300 bg-white p-3 text-[13px] placeholder:text-gray-400/70"
                  />
                  <DropZone onFiles={addFiles} className="min-h-0 flex-[1_3_0%]" />
                  {files.length > 0 && (
                    <div className="flex shrink-0 flex-col gap-0.5">
                      {files.map((f, i) => (
                        <div
                          key={`${f.name}-${f.size}`}
                          className="bg-muted/30 text-muted-foreground flex items-center justify-between rounded-sm border border-gray-300 px-2.5 py-1 text-[11px]"
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
                </div>
              </FieldBlock>
            </div>

            {/* Contexte additionnel — fixed height */}
            <div className={`shrink-0 px-4 py-4 ${hasResult ? 'border-b border-gray-300' : ''}`}>
              <FieldBlock
                label="Contexte complémentaire"
                hint="Le contexte complémentaire permet d’ajouter des informations utiles mais secondaires pour affiner la réponse."
              >
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Le locataire n’a pas reçu de réponse depuis trois semaines…"
                  className="field-sizing:fixed! h-18 resize-none border-gray-300 bg-white p-3 text-[13px] placeholder:text-gray-400/70"
                />
              </FieldBlock>
            </div>

            {/* Consignes de rédaction — conditional, fixed height */}
            {hasResult && (
              <div className="shrink-0 px-4 py-4">
                <FieldBlock
                  label="Ajustements souhaités"
                  hint="Indiquez comment améliorer ou ajuster la réponse générée."
                >
                  <Input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="ex : plus détaillé, plus synthétique…"
                    className="border-gray-300 bg-white text-[13px] placeholder:text-gray-400/70"
                  />
                </FieldBlock>
              </div>
            )}
          </div>

          {/* Left panel footer */}
          <div className="flex shrink-0 flex-col gap-1.5 border-t border-gray-300 px-4 py-3">
            <div className="flex gap-1.5">
              <Button
                onClick={() => void generate(hasResult)}
                disabled={isGenerating}
                className="h-10 flex-1 gap-2 text-[13px] font-bold"
              >
                {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isGenerating
                  ? `Génération… ${elapsedSeconds}s`
                  : hasResult
                    ? 'Regénérer la réponse'
                    : 'Générer la réponse'}
              </Button>
              <Button
                variant="outline"
                onClick={resetAll}
                disabled={isGenerating}
                className="h-10 gap-2 text-[13px]"
              >
                Effacer
              </Button>
            </div>
            {errorMsg && (
              <p className="text-destructive mt-1 text-center text-[11px]">{errorMsg}</p>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── RIGHT PANEL : response ── */}
        <ResizablePanel defaultSize={61} className="flex flex-col">
          <div className="flex min-h-0 flex-1 flex-col p-4 pb-0">
            {hasResult && !isGenerating ? (
              <textarea
                value={displayedResult}
                onChange={(e) => {
                  setDisplayedResult(e.target.value)
                  setResult(e.target.value)
                }}
                className="text-foreground flex-1 resize-none rounded-lg border-0 bg-transparent p-6 text-[17px] leading-relaxed outline-none focus:ring-0"
                style={{ fontFamily: "'SourceSerif4', Georgia, serif" }}
              />
            ) : (
              <div className="relative flex-1">
                <AsciiBackground
                  isAnimated={isGenerating}
                  label="La_réponse_sera_générée_ici_"
                  opacity={isGenerating ? 0.85 : 0.75}
                />
              </div>
            )}
          </div>

          {/* Right panel footer */}
          <div className="flex shrink-0 gap-2 border-t border-gray-300 px-4 py-3">
            <Button
              onClick={() => void copyToClipboard()}
              disabled={!hasResult}
              variant="outline"
              className="h-10 flex-1 gap-2 text-[13px]"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              {copied ? '✓ Copié' : 'Copier la réponse'}
            </Button>
            <Button disabled variant="outline" className="h-10 flex-1 gap-2 text-[13px]">
              <FileText className="h-3.5 w-3.5" />
              Générer un document Word
            </Button>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FieldBlock({
  label,
  hint,
  children,
  className
}: {
  label: string
  hint: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5">
        <p className="text-foreground text-[14px] font-semibold">{label}</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="text-muted-foreground/60 h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-64">
              {hint}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  )
}

function DropZone({
  onFiles,
  className
}: {
  onFiles: (files: File[]) => void
  className?: string
}) {
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
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-5 transition-colors ${
        dragging
          ? 'border-gray-400 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      } ${className ?? ''}`}
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
      <Upload
        className={`h-4 w-4 transition-colors ${dragging ? 'text-gray-500' : 'text-gray-300'}`}
      />
      <div className="text-center">
        <p className="text-[12px] font-medium text-gray-600">
          {dragging ? 'Déposez les fichiers ici' : 'Déposer des fichiers'}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400/70">PDF/IMG · cliquez ou glissez-déposez</p>
      </div>
    </div>
  )
}
