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
import { useCallback, useEffect, useState } from 'react'

// ── Toolbar ────────────────────────────────────────────────────────────────────

type BlockType = 'paragraph' | 'h3' | 'ul'

function TBtn({
  active,
  title,
  onClick,
  children
}: {
  active: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
        active ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarPlugin({ actions }: { actions?: React.ReactNode }) {
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
    <div className="sticky top-0 z-10 mb-3 flex items-center gap-0.5 border-b border-gray-100 bg-stone-50 pb-2">
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
      {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
    </div>
  )
}

// ── AnalysisEditor ─────────────────────────────────────────────────────────────

interface Props {
  content: string
  onChange: (md: string) => void
  actions?: React.ReactNode
}

export function AnalysisEditor({ content, onChange, actions }: Props) {
  const initialConfig = {
    namespace: 'AnalysisEditor',
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    editorState: () => $convertFromMarkdownString(content, TRANSFORMERS),
    onError: (err: Error) => console.error(err),
    theme: {}
  }

  function handleChange(state: EditorState) {
    state.read(() => {
      const md = $convertToMarkdownString(TRANSFORMERS)
      onChange(md)
    })
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <ToolbarPlugin actions={actions} />
      <RichTextPlugin
        contentEditable={<ContentEditable className="sd-analyse outline-none" />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <OnChangePlugin onChange={handleChange} />
    </LexicalComposer>
  )
}
