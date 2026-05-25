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
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
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
  mergeRegister,
  type EditorState
} from 'lexical'
import { Bold, Heading3, Italic, List } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { artifactLexicalTheme, artifactProseClassName } from '@/lib/workflow-analysis-prose'

type BlockType = 'paragraph' | 'h3' | 'ul'

type Variant = 'analysis' | 'response'

function TBtn({
  active,
  title,
  onClick,
  children
}: {
  active: boolean
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-background',
        active && 'bg-white'
      )}
    >
      {children}
    </button>
  )
}

function ToolbarPlugin({ actions }: { actions?: ReactNode }) {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>('paragraph')

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    setIsBold(selection.hasFormat('bold'))
    setIsItalic(selection.hasFormat('italic'))
    const anchor = selection.anchor.getNode()
    const el = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElement()
    if (!el) return
    if ($isHeadingNode(el) && el.getTag() === 'h3') setBlockType('h3')
    else if ($isListNode(el)) setBlockType('ul')
    else setBlockType('paragraph')
  }, [])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => editorState.read(updateToolbar)),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, updateToolbar])

  const toggleH3 = () =>
    editor.update(() => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      $setBlocksType(sel, () =>
        blockType === 'h3' ? $createParagraphNode() : $createHeadingNode('h3')
      )
    })

  const toggleList = () =>
    blockType === 'ul'
      ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      : editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)

  return (
    <div className="workflow-artifact-editor-toolbar">
      <TBtn active={blockType === 'h3'} title="Titre (H3)" onClick={toggleH3}>
        <Heading3 className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        active={isBold}
        title="Gras"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      >
        <Bold className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn
        active={isItalic}
        title="Italique"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      >
        <Italic className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn active={blockType === 'ul'} title="Liste à puces" onClick={toggleList}>
        <List className="h-3.5 w-3.5" />
      </TBtn>
      {actions ? <div className="ml-auto flex items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}

function EditablePlugin({ isStreaming }: { isStreaming: boolean }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.setEditable(!isStreaming)
  }, [editor, isStreaming])

  return null
}

function MarkdownSyncPlugin({ markdown, isStreaming }: { markdown: string; isStreaming: boolean }) {
  const [editor] = useLexicalComposerContext()
  const lastApplied = useRef(markdown)

  useEffect(() => {
    if (!isStreaming) {
      lastApplied.current = markdown
      return
    }
    if (markdown === lastApplied.current) return

    editor.update(
      () => {
        const current = $convertToMarkdownString(TRANSFORMERS)
        if (current === markdown) {
          lastApplied.current = markdown
          return
        }
        $convertFromMarkdownString(markdown, TRANSFORMERS)
        lastApplied.current = markdown
      },
      { tag: 'markdown-sync' }
    )
  }, [editor, markdown, isStreaming])

  return null
}

function MarkdownOnChangePlugin({
  isStreaming,
  onChange
}: {
  isStreaming: boolean
  onChange: (md: string) => void
}) {
  const streamingRef = useRef(isStreaming)
  streamingRef.current = isStreaming

  const handleChange = useCallback(
    (state: EditorState) => {
      if (streamingRef.current) return
      state.read(() => {
        onChange($convertToMarkdownString(TRANSFORMERS))
      })
    },
    [onChange]
  )

  return <OnChangePlugin onChange={handleChange} />
}

export type ArtifactMarkdownEditorProps = {
  content: string
  onChange: (md: string) => void
  isStreaming: boolean
  variant: Variant
  actions?: ReactNode
}

function contentEditableClassName() {
  return cn(artifactProseClassName, 'block min-h-[120px] w-full outline-none')
}

export function ArtifactMarkdownEditor({
  content,
  onChange,
  isStreaming,
  variant,
  actions
}: ArtifactMarkdownEditorProps) {
  const initialConfig = {
    namespace: `ArtifactMarkdownEditor-${variant}`,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    editorState: () => {
      if (content.trim()) {
        $convertFromMarkdownString(content, TRANSFORMERS)
      }
    },
    onError: (err: Error) => console.error(err),
    theme: artifactLexicalTheme,
    editable: !isStreaming
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {!isStreaming ? <ToolbarPlugin actions={actions} /> : null}
      <RichTextPlugin
        contentEditable={<ContentEditable className={contentEditableClassName()} />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <EditablePlugin isStreaming={isStreaming} />
      <MarkdownSyncPlugin markdown={content} isStreaming={isStreaming} />
      <MarkdownOnChangePlugin isStreaming={isStreaming} onChange={onChange} />
      <HistoryPlugin />
      <ListPlugin />
    </LexicalComposer>
  )
}
