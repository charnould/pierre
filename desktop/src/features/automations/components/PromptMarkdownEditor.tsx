import { $createCodeNode, $isCodeNode, CodeNode } from '@lexical/code'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND
} from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode
} from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { INSERT_TABLE_COMMAND, TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type EditorThemeClasses
} from 'lexical'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Table
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'

import { PROMPT_TRANSFORMERS } from './prompt-markdown'

const EDITOR_THEME: EditorThemeClasses = {
  code: 'bg-muted mb-2 block overflow-x-auto rounded-md px-2.5 py-2 font-mono text-xs',
  heading: {
    h1: 'mb-2 text-base font-medium',
    h2: 'mb-2 text-sm font-medium',
    h3: 'mb-2 text-sm font-medium'
  },
  list: {
    listitem: 'my-0.5',
    ol: 'mb-2 list-decimal ps-5',
    ul: 'mb-2 list-disc ps-5'
  },
  paragraph: 'mb-2 last:mb-0',
  quote: 'text-muted-foreground mb-2 border-s-2 border-border ps-3',
  table: 'my-2 w-full border-collapse',
  tableCell: 'border-border border px-2 py-1 text-start align-top',
  tableCellHeader: 'bg-muted font-medium',
  text: {
    bold: 'font-medium',
    code: 'bg-muted rounded-sm px-1 font-mono text-xs',
    italic: 'italic'
  }
}

const NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  CodeNode
]

type HeadingLevel = 'h1' | 'h2' | 'h3'
type ListKind = 'bullet' | 'number'

function PromptMarkdownToolbar() {
  const [editor] = useLexicalComposerContext()
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [heading, setHeading] = useState<HeadingLevel | null>(null)
  const [list, setList] = useState<ListKind | null>(null)
  const [quote, setQuote] = useState(false)
  const [code, setCode] = useState(false)

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        const element = selection.anchor.getNode().getTopLevelElement()
        setBold(selection.hasFormat('bold'))
        setItalic(selection.hasFormat('italic'))
        setHeading($isHeadingNode(element) ? (element.getTag() as HeadingLevel) : null)
        setList(
          $isListNode(element) ? (element.getListType() === 'number' ? 'number' : 'bullet') : null
        )
        setQuote($isQuoteNode(element))
        setCode($isCodeNode(element))
      })
    })
  }, [editor])

  function formatHeading(tag: HeadingLevel) {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const element = selection.anchor.getNode().getTopLevelElement()
      $setBlocksType(selection, () =>
        $isHeadingNode(element) && element.getTag() === tag
          ? $createParagraphNode()
          : $createHeadingNode(tag)
      )
    })
  }

  function formatQuote() {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const element = selection.anchor.getNode().getTopLevelElement()
      $setBlocksType(selection, () =>
        $isQuoteNode(element) ? $createParagraphNode() : $createQuoteNode()
      )
    })
  }

  function formatCode() {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const element = selection.anchor.getNode().getTopLevelElement()
      $setBlocksType(selection, () =>
        $isCodeNode(element) ? $createParagraphNode() : $createCodeNode()
      )
    })
  }

  function formatList(kind: ListKind) {
    if (list === kind) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      return
    }
    editor.dispatchCommand(
      kind === 'number' ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
      undefined
    )
  }

  return (
    <div
      role="toolbar"
      aria-label="Mise en forme"
      className="border-border/60 flex flex-wrap items-center gap-1 border-b px-1 py-1"
    >
      <ButtonGroup>
        <ToolbarButton
          label="Titre 1"
          pressed={heading === 'h1'}
          onClick={() => formatHeading('h1')}
        >
          <Heading1 />
        </ToolbarButton>
        <ToolbarButton
          label="Titre 2"
          pressed={heading === 'h2'}
          onClick={() => formatHeading('h2')}
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          label="Titre 3"
          pressed={heading === 'h3'}
          onClick={() => formatHeading('h3')}
        >
          <Heading3 />
        </ToolbarButton>
      </ButtonGroup>
      <ButtonGroup>
        <ToolbarButton
          label="Gras"
          pressed={bold}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Italique"
          pressed={italic}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        >
          <Italic />
        </ToolbarButton>
      </ButtonGroup>
      <ButtonGroup>
        <ToolbarButton
          label="Liste"
          pressed={list === 'bullet'}
          onClick={() => formatList('bullet')}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Liste numérotée"
          pressed={list === 'number'}
          onClick={() => formatList('number')}
        >
          <ListOrdered />
        </ToolbarButton>
      </ButtonGroup>
      <ButtonGroup>
        <ToolbarButton
          label="Tableau"
          onClick={() =>
            editor.dispatchCommand(INSERT_TABLE_COMMAND, {
              columns: '2',
              rows: '2',
              includeHeaders: true
            })
          }
        >
          <Table />
        </ToolbarButton>
        <ToolbarButton label="Citation" pressed={quote} onClick={formatQuote}>
          <Quote />
        </ToolbarButton>
        <ToolbarButton label="Code" pressed={code} onClick={formatCode}>
          <Code />
        </ToolbarButton>
      </ButtonGroup>
    </div>
  )
}

function ToolbarButton({
  label,
  pressed,
  onClick,
  children
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={pressed}
            className={pressed ? 'bg-muted' : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function MarkdownSyncPlugin({ onChange }: { onChange: (markdown: string) => void }) {
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        editorState.read(() => {
          onChange($convertToMarkdownString(PROMPT_TRANSFORMERS))
        })
      }}
    />
  )
}

export function PromptMarkdownEditor({
  id,
  value,
  onChange,
  placeholder
}: {
  id: string
  value: string
  onChange: (markdown: string) => void
  placeholder: string
}) {
  const initialMarkdown = useRef(value).current

  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'PromptMarkdownEditor',
        nodes: NODES,
        onError(error: Error) {
          console.error('[PromptMarkdownEditor]', error)
        },
        theme: EDITOR_THEME,
        editorState: () => {
          $convertFromMarkdownString(initialMarkdown, PROMPT_TRANSFORMERS)
        }
      }}
    >
      <div
        className={cn(
          'w-full rounded-lg border border-input bg-transparent transition-colors',
          'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
          'dark:bg-input/30'
        )}
      >
        <PromptMarkdownToolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id={id}
                aria-label="Instructions"
                aria-placeholder={placeholder}
                placeholder={
                  <div className="text-muted-foreground pointer-events-none absolute start-2.5 top-2 text-sm">
                    {placeholder}
                  </div>
                }
                className="min-h-78 px-2.5 py-2 text-sm outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <TablePlugin hasCellMerge={false} hasCellBackgroundColor={false} hasHorizontalScroll />
      <MarkdownShortcutPlugin transformers={PROMPT_TRANSFORMERS} />
      <MarkdownSyncPlugin onChange={onChange} />
    </LexicalComposer>
  )
}
