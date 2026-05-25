import {
  $isListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND
} from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from '@lexical/markdown'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { $createHeadingNode, $isHeadingNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  mergeRegister
} from 'lexical'
import { Bold, Heading3, Italic, List } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode
} from 'react'

import { DockToolbar } from '@/features/workflow/components/DockToolbar'
import { DockToolbarPortal } from '@/features/workflow/components/DockToolbarPortal'
import { WorkflowArtifactStreamPreview } from '@/features/workflow/components/WorkflowArtifactStreamPreview'
import {
  artifactLexicalTheme,
  artifactProseClassName
} from '@/features/workflow/lib/workflow-analysis-prose'
import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'

type BlockType = 'paragraph' | 'h3' | 'ul'

type Variant = 'analysis' | 'output'

type ToolbarState = { bold: boolean; italic: boolean; block: BlockType }

const IGNORED_LEXICAL_TAGS = new Set(['history-merge', 'historic'])

function FormatDockButton({
  label,
  active = false,
  disabled = false,
  onMouseDown,
  children
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={label}
            aria-pressed={active || undefined}
            className={cn('text-foreground shadow-none', active && 'bg-muted text-foreground')}
            onMouseDown={onMouseDown}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function FormatToolbarButtons({
  disabled = false,
  toolbar = { bold: false, italic: false, block: 'paragraph' as BlockType },
  onToggleH3,
  onToggleBold,
  onToggleItalic,
  onToggleList
}: {
  disabled?: boolean
  toolbar?: ToolbarState
  onToggleH3?: () => void
  onToggleBold?: () => void
  onToggleItalic?: () => void
  onToggleList?: () => void
}) {
  return (
    <ButtonGroup aria-label="Mise en forme">
      <FormatDockButton
        label="Titre (H3)"
        active={toolbar.block === 'h3'}
        disabled={disabled}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) onToggleH3?.()
        }}
      >
        <Heading3 />
      </FormatDockButton>
      <FormatDockButton
        label="Gras"
        active={toolbar.bold}
        disabled={disabled}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) onToggleBold?.()
        }}
      >
        <Bold />
      </FormatDockButton>
      <FormatDockButton
        label="Italique"
        active={toolbar.italic}
        disabled={disabled}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) onToggleItalic?.()
        }}
      >
        <Italic />
      </FormatDockButton>
      <FormatDockButton
        label="Liste à puces"
        active={toolbar.block === 'ul'}
        disabled={disabled}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!disabled) onToggleList?.()
        }}
      >
        <List />
      </FormatDockButton>
    </ButtonGroup>
  )
}

function DockToolbarContent({
  actions,
  dockLead,
  disabled = false,
  toolbar,
  onToggleH3,
  onToggleBold,
  onToggleItalic,
  onToggleList,
  className,
  deskLayout = false,
  hideFormatToolbar = false
}: {
  actions?: ReactNode
  dockLead?: ReactNode
  disabled?: boolean
  toolbar?: ToolbarState
  onToggleH3?: () => void
  onToggleBold?: () => void
  onToggleItalic?: () => void
  onToggleList?: () => void
  className?: string
  deskLayout?: boolean
  hideFormatToolbar?: boolean
}) {
  const showFormat = !hideFormatToolbar && !(deskLayout && disabled)
  const hasActions = !!actions

  return (
    <DockToolbar className={cn(deskLayout && 'desk-output-dock', className)}>
      {dockLead ? <div className="desk-output-dock__lead shrink-0">{dockLead}</div> : null}
      {dockLead && (showFormat || hasActions) ? (
        <div aria-hidden className="desk-output-dock__split" />
      ) : null}
      {showFormat ? (
        <div className="desk-output-dock__format shrink-0">
          <FormatToolbarButtons
            disabled={disabled}
            toolbar={toolbar}
            onToggleH3={onToggleH3}
            onToggleBold={onToggleBold}
            onToggleItalic={onToggleItalic}
            onToggleList={onToggleList}
          />
        </div>
      ) : null}
      {showFormat && hasActions ? <div aria-hidden className="desk-output-dock__split" /> : null}
      {hasActions ? (
        <div className="desk-output-dock__actions ml-auto flex min-w-0 shrink-0 items-center gap-2">
          {actions}
        </div>
      ) : null}
    </DockToolbar>
  )
}

export function ArtifactInactiveDockToolbar({
  actions,
  dockLead,
  deskLayout = false
}: {
  actions?: ReactNode
  dockLead?: ReactNode
  deskLayout?: boolean
}) {
  return (
    <DockToolbarContent
      actions={actions}
      dockLead={dockLead}
      disabled
      deskLayout={deskLayout}
      hideFormatToolbar={deskLayout}
    />
  )
}

function ToolbarPlugin({
  actions,
  dockLead,
  disabled = false,
  className,
  deskLayout = false,
  hideFormatToolbar = false
}: {
  actions?: ReactNode
  dockLead?: ReactNode
  disabled?: boolean
  className?: string
  deskLayout?: boolean
  hideFormatToolbar?: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const [toolbar, setToolbar] = useState<ToolbarState>({
    bold: false,
    italic: false,
    block: 'paragraph'
  })

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return

    let block: BlockType = 'paragraph'
    const anchor = selection.anchor.getNode()
    const el = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElement()
    if (el) {
      if ($isHeadingNode(el) && el.getTag() === 'h3') block = 'h3'
      else if ($isListNode(el)) block = 'ul'
    }

    const next: ToolbarState = {
      bold: selection.hasFormat('bold'),
      italic: selection.hasFormat('italic'),
      block
    }
    setToolbar((prev) =>
      prev.bold === next.bold && prev.italic === next.italic && prev.block === next.block
        ? prev
        : next
    )
  }, [])

  const scheduleToolbarUpdate = useCallback(() => {
    queueMicrotask(() => editor.getEditorState().read(updateToolbar))
  }, [editor, updateToolbar])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ tags }) => {
        if ([...tags].some((tag) => IGNORED_LEXICAL_TAGS.has(tag))) return
        scheduleToolbarUpdate()
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          scheduleToolbarUpdate()
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, scheduleToolbarUpdate])

  const toggleH3 = () =>
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      $setBlocksType(sel, () =>
        toolbar.block === 'h3' ? $createParagraphNode() : $createHeadingNode('h3')
      )
    })

  const toggleList = () =>
    toolbar.block === 'ul'
      ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      : editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)

  return (
    <DockToolbarContent
      actions={actions}
      dockLead={dockLead}
      disabled={disabled}
      toolbar={toolbar}
      onToggleH3={toggleH3}
      onToggleBold={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      onToggleItalic={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      onToggleList={toggleList}
      className={className}
      deskLayout={deskLayout}
      hideFormatToolbar={hideFormatToolbar}
    />
  )
}

function EditablePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    editor.setEditable(editable)
  }, [editor, editable])
  return null
}

function MarkdownOnChangePlugin({
  markdown,
  onChange
}: {
  markdown: string
  onChange: (md: string) => void
}) {
  const [editor] = useLexicalComposerContext()
  const markdownRef = useRef(markdown)
  markdownRef.current = markdown

  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      if ([...tags].some((tag) => IGNORED_LEXICAL_TAGS.has(tag))) return
      queueMicrotask(() => {
        editor.getEditorState().read(() => {
          const md = $convertToMarkdownString(TRANSFORMERS)
          if (md === markdownRef.current) return
          onChange(md)
        })
      })
    })
  }, [editor, onChange])

  return null
}

function LexicalEditorBody({
  content,
  onChange,
  variant,
  actions,
  toolbarSlot,
  leadingContent,
  readOnly = false,
  onRequestEdit,
  deskDock = false,
  hideFormatToolbar = false,
  dockLead
}: {
  content: string
  onChange: (md: string) => void
  variant: Variant
  actions?: ReactNode
  toolbarSlot?: HTMLElement | null
  leadingContent?: ReactNode
  readOnly?: boolean
  onRequestEdit?: () => void
  deskDock?: boolean
  hideFormatToolbar?: boolean
  dockLead?: ReactNode
}) {
  const initialContentRef = useRef(content)
  initialContentRef.current = content

  const initialConfig = useMemo(
    () => ({
      namespace: `ArtifactMarkdownEditor-${variant}`,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
      editorState: () => {
        const md = initialContentRef.current
        if (md.trim()) {
          $convertFromMarkdownString(md, TRANSFORMERS)
        }
      },
      onError: (err: Error) => console.error(err),
      theme: artifactLexicalTheme
    }),
    [variant]
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditablePlugin editable={!readOnly} />
      {toolbarSlot ? (
        <DockToolbarPortal slot={toolbarSlot}>
          <ToolbarPlugin
            actions={actions}
            dockLead={dockLead}
            disabled={readOnly}
            deskLayout={deskDock}
            hideFormatToolbar={hideFormatToolbar}
          />
        </DockToolbarPortal>
      ) : (
        <ToolbarPlugin
          actions={actions}
          dockLead={dockLead}
          disabled={readOnly}
          deskLayout={deskDock}
          hideFormatToolbar={hideFormatToolbar}
        />
      )}
      <div className="workflow-artifact-editor">
        <div className="workflow-artifact-editor-scroll">
          {leadingContent}
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  artifactProseClassName,
                  variant === 'output' && 'llm-answer',
                  'block min-h-[120px] w-full outline-none',
                  readOnly && 'cursor-text'
                )}
                onPointerDown={
                  readOnly
                    ? (e) => {
                        e.preventDefault()
                        onRequestEdit?.()
                      }
                    : undefined
                }
              />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          {!readOnly ? <MarkdownOnChangePlugin markdown={content} onChange={onChange} /> : null}
          <ListPlugin />
        </div>
      </div>
    </LexicalComposer>
  )
}

export type ArtifactMarkdownEditorProps = {
  content: string
  onChange: (md: string) => void
  isStreaming: boolean
  variant: Variant
  actions?: ReactNode
  toolbarSlot?: HTMLElement | null
  liveMarkdownWhileStreaming?: boolean
  leadingContent?: ReactNode
  readOnly?: boolean
  onRequestEdit?: () => void
  deskDock?: boolean
  hideFormatToolbar?: boolean
  dockLead?: ReactNode
}

export function ArtifactMarkdownEditor({
  content,
  onChange,
  isStreaming,
  variant,
  actions,
  toolbarSlot,
  liveMarkdownWhileStreaming = false,
  leadingContent,
  readOnly = false,
  onRequestEdit,
  deskDock = false,
  hideFormatToolbar = false,
  dockLead
}: ArtifactMarkdownEditorProps) {
  const useLiveMd = liveMarkdownWhileStreaming && isStreaming
  const scrollRef = useRef<HTMLDivElement>(null)

  if (useLiveMd) {
    return (
      <div className="workflow-artifact-editor-root">
        {toolbarSlot ? (
          <DockToolbarPortal slot={toolbarSlot}>
            <ArtifactInactiveDockToolbar
              actions={actions}
              dockLead={dockLead}
              deskLayout={deskDock}
            />
          </DockToolbarPortal>
        ) : actions || dockLead ? (
          <ArtifactInactiveDockToolbar
            actions={actions}
            dockLead={dockLead}
            deskLayout={deskDock}
          />
        ) : null}
        <div className="workflow-artifact-editor">
          <div
            ref={scrollRef}
            className="workflow-artifact-editor-scroll workflow-artifact-body-scroll workflow-reflexion-stream-wrap"
          >
            {leadingContent}
            <WorkflowArtifactStreamPreview
              content={content}
              isStreaming
              variant={variant}
              scrollRef={scrollRef}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="workflow-artifact-editor-root">
      <LexicalEditorBody
        content={content}
        onChange={onChange}
        variant={variant}
        actions={actions}
        toolbarSlot={toolbarSlot}
        leadingContent={leadingContent}
        readOnly={readOnly}
        onRequestEdit={onRequestEdit}
        deskDock={deskDock}
        hideFormatToolbar={hideFormatToolbar}
        dockLead={dockLead}
      />
    </div>
  )
}
