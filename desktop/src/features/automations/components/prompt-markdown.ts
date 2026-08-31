import type { ElementTransformer, Transformer } from '@lexical/markdown'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST
} from '@lexical/markdown'
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode
} from '@lexical/table'
import { $isParagraphNode, type LexicalNode } from 'lexical'

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/

const INLINE_TRANSFORMERS = [
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE
]

function $createMarkdownTableCell(textContent: string): TableCellNode {
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS)
  $convertFromMarkdownString(textContent.replace(/\\n/g, '\n'), INLINE_TRANSFORMERS, cell)
  return cell
}

function $cellsFromRow(text: string): TableCellNode[] | null {
  const match = text.match(TABLE_ROW_REG_EXP)
  if (!match?.[1]) return null
  return match[1].split('|').map((value) => $createMarkdownTableCell(value.trim()))
}

const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) return null
    const lines: string[] = []
    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) continue
      const cells: string[] = []
      let headerRow = false
      for (const cell of row.getChildren()) {
        if (!$isTableCellNode(cell)) continue
        cells.push($convertToMarkdownString(INLINE_TRANSFORMERS, cell).replace(/\n/g, '\\n'))
        if (cell.hasHeaderState(TableCellHeaderStates.ROW)) headerRow = true
      }
      lines.push(`| ${cells.join(' | ')} |`)
      if (headerRow) lines.push(`| ${cells.map(() => '---').join(' | ')} |`)
    }
    return lines.join('\n')
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _children, match) => {
    const raw = match[0] ?? ''
    if (TABLE_ROW_DIVIDER_REG_EXP.test(raw)) {
      const previous = parentNode.getPreviousSibling()
      if ($isTableNode(previous)) {
        const firstRow = previous.getFirstChild()
        if ($isTableRowNode(firstRow)) {
          for (const cell of firstRow.getChildren()) {
            if ($isTableCellNode(cell)) cell.setHeaderStyles(TableCellHeaderStates.ROW)
          }
        }
        parentNode.remove()
      }
      return
    }

    const rowCells = $cellsFromRow(raw)
    if (!rowCells) return

    const previous = parentNode.getPreviousSibling()
    if ($isTableNode(previous)) {
      const row = $createTableRowNode()
      for (const cell of rowCells) row.append(cell)
      previous.append(row)
      parentNode.remove()
      return
    }

    const collected = [rowCells]
    let sibling = previous
    while ($isParagraphNode(sibling)) {
      const text = sibling.getTextContent()
      if (TABLE_ROW_DIVIDER_REG_EXP.test(text)) {
        const headerCells = collected[0]
        if (headerCells) {
          for (const cell of headerCells) cell.setHeaderStyles(TableCellHeaderStates.ROW)
        }
        const before = sibling.getPreviousSibling()
        sibling.remove()
        sibling = before
        continue
      }
      const cells = $cellsFromRow(text)
      if (!cells) break
      collected.unshift(cells)
      const before = sibling.getPreviousSibling()
      sibling.remove()
      sibling = before
    }

    const table = $createTableNode()
    const columnCount = Math.max(...collected.map((row) => row.length))
    for (const cells of collected) {
      const row = $createTableRowNode()
      for (let i = 0; i < columnCount; i++) {
        row.append(cells[i] ?? $createMarkdownTableCell(''))
      }
      table.append(row)
    }
    parentNode.replace(table)
  },
  type: 'element'
}

export const PROMPT_TRANSFORMERS: Transformer[] = [
  TABLE,
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CODE,
  ...INLINE_TRANSFORMERS
]
