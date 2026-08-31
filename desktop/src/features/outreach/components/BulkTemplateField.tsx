import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent
} from 'react'

import {
  filterSlashFields,
  getSlashFieldTrigger,
  insertSlashField,
  type SlashFieldTrigger
} from '@/features/outreach/lib/bulk-template-command'
import { Command, CommandGroup, CommandItem, CommandList } from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

type FieldItem = { value: string; label: string }

interface Props {
  id: string
  value: string
  fields: FieldItem[]
  fieldsLoading: boolean
  fieldsError: string | null
  onChange: (value: string) => void
  multiline?: boolean
}

const TOKEN_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g

function appendValue(root: HTMLElement, value: string): void {
  root.replaceChildren()
  let offset = 0
  for (const match of value.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0
    if (index > offset) root.append(document.createTextNode(value.slice(offset, index)))
    const field = match[1]!
    const token = document.createElement('span')
    token.contentEditable = 'false'
    token.dataset['field'] = field
    token.className =
      'inline-flex rounded-md bg-muted px-1 text-foreground align-baseline select-none'
    token.textContent = `/${field}`
    root.append(token)
    offset = index + match[0].length
  }
  if (offset < value.length) root.append(document.createTextNode(value.slice(offset)))
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node instanceof HTMLElement && node.dataset['field']) return `{{${node.dataset['field']}}}`
  let value = ''
  for (const child of node.childNodes) value += serializeNode(child)
  if (node instanceof HTMLDivElement && node.nextSibling) value += '\n'
  if (node instanceof HTMLBRElement) value += '\n'
  return value
}

function selectionOffset(root: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) {
    return serializeNode(root).length
  }
  const range = document.createRange()
  range.selectNodeContents(root)
  range.setEnd(selection.anchorNode, selection.anchorOffset)
  return serializeNode(range.cloneContents()).length
}

function setSelectionOffset(root: HTMLElement, target: number): void {
  const range = document.createRange()
  let offset = 0
  const visit = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0
      if (target <= offset + length) {
        range.setStart(node, Math.max(0, target - offset))
        return true
      }
      offset += length
      return false
    }
    if (node instanceof HTMLElement && node.dataset['field']) {
      const length = `{{${node.dataset['field']}}}`.length
      const parent = node.parentNode
      if (parent && target <= offset + length) {
        const index = [...parent.childNodes].indexOf(node)
        range.setStart(parent, target <= offset ? index : index + 1)
        return true
      }
      offset += length
      return false
    }
    for (const child of node.childNodes) {
      if (visit(child)) return true
    }
    return false
  }
  if (!visit(root)) {
    range.selectNodeContents(root)
    range.collapse(false)
  } else {
    range.collapse(true)
  }
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

export function BulkTemplateField({
  id,
  value,
  fields,
  fieldsLoading,
  fieldsError,
  onChange,
  multiline = true
}: Props) {
  const listboxId = useId()
  const editorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(value)
  const [empty, setEmpty] = useState(value.length === 0)
  const [trigger, setTrigger] = useState<SlashFieldTrigger | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const suggestions = trigger ? filterSlashFields(fields, trigger.query) : []

  const render = useCallback((next: string, caret?: number) => {
    const editor = editorRef.current
    if (!editor) return
    appendValue(editor, next)
    setEmpty(next.length === 0)
    if (caret !== undefined) {
      editor.focus()
      setSelectionOffset(editor, caret)
    }
  }, [])

  useLayoutEffect(() => render(value), [render, value])
  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    render(value)
  }, [render, value])

  const syncTrigger = useCallback((next: string, caret: number) => {
    setTrigger(getSlashFieldTrigger(next, caret))
    setActiveIndex(0)
  }, [])

  const emitValue = (editor: HTMLDivElement) => {
    const next = serializeNode(editor)
    lastEmitted.current = next
    setEmpty(next.length === 0)
    onChange(next)
    syncTrigger(next, selectionOffset(editor))
  }

  const handleInput = (event: FormEvent<HTMLDivElement>) => emitValue(event.currentTarget)

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const selection = window.getSelection()
    if (!selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    const text = multiline
      ? event.clipboardData.getData('text/plain')
      : event.clipboardData.getData('text/plain').replace(/\s*\n+\s*/g, ' ')
    const node = document.createTextNode(text)
    range.deleteContents()
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    emitValue(event.currentTarget)
  }

  const selectField = useCallback(
    (field: string) => {
      const editor = editorRef.current
      if (!editor || !trigger) return
      const caret = selectionOffset(editor)
      const result = insertSlashField(serializeNode(editor), trigger, field, caret)
      lastEmitted.current = result.value
      setTrigger(null)
      render(result.value, result.caret)
      onChange(result.value)
    },
    [onChange, render, trigger]
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && event.key === 'Enter') {
      event.preventDefault()
      return
    }
    if (!trigger) return
    if (event.key === 'Escape') {
      event.preventDefault()
      setTrigger(null)
      return
    }
    if (suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const field = suggestions[activeIndex]
      if (field) selectField(field.value)
    }
  }

  useEffect(() => {
    if (!trigger) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-field-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, trigger])

  return (
    <Popover
      open={trigger !== null}
      onOpenChange={(open) => !open && setTrigger(null)}
      modal={false}
    >
      <div className="relative">
        <PopoverTrigger
          render={<span />}
          nativeButton={false}
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none absolute inset-0"
        />
        {empty ? (
          <span className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 text-sm">
            Tapez / pour insérer un champ
          </span>
        ) : null}
        <div
          id={id}
          ref={editorRef}
          data-slot="bulk-template-field"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={trigger !== null}
          aria-controls={listboxId}
          aria-activedescendant={
            trigger && suggestions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-multiline={multiline}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            multiline
              ? 'min-h-24 py-2 whitespace-pre-wrap'
              : 'h-8 overflow-hidden py-1 whitespace-nowrap'
          )}
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={() => {
            const editor = editorRef.current
            if (editor) syncTrigger(serializeNode(editor), selectionOffset(editor))
          }}
          onKeyUp={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            const editor = editorRef.current
            if (editor) syncTrigger(serializeNode(editor), selectionOffset(editor))
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => window.setTimeout(() => setTrigger(null), 120)}
        />
      </div>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        initialFocus={false}
        finalFocus={editorRef}
        className="w-(--anchor-width) p-0"
        onMouseDown={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList ref={listRef} id={listboxId} role="listbox" aria-label="Insérer un champ">
            {fieldsLoading ? (
              <p className="text-muted-foreground px-2.5 py-2 text-xs">Chargement…</p>
            ) : fieldsError ? (
              <p className="text-destructive px-2.5 py-2 text-xs">{fieldsError}</p>
            ) : suggestions.length === 0 ? (
              <p className="text-muted-foreground px-2.5 py-2 text-xs">Aucun champ trouvé.</p>
            ) : (
              <CommandGroup>
                {suggestions.map((field, index) => (
                  <CommandItem
                    id={`${listboxId}-option-${index}`}
                    key={field.value}
                    value={field.value}
                    data-field-index={index}
                    aria-selected={index === activeIndex}
                    className={cn(index === activeIndex && 'bg-muted text-foreground')}
                    onMouseEnter={() => setActiveIndex(index)}
                    onSelect={() => selectField(field.value)}
                  >
                    /{field.value}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
