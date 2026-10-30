#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

XLSX.set_cptable(cpexcel)

const MAX_ROWS = 20_000
const path = process.argv[2]
if (!path) {
  console.error('usage: extract-spreadsheet FILE')
  process.exit(1)
}

const workbook = XLSX.read(readFileSync(path), { dense: true, sheetRows: MAX_ROWS + 1 })
let remainingRows = MAX_ROWS
let truncated = false

for (const name of workbook.SheetNames) {
  if (remainingRows === 0) {
    truncated = true
    break
  }
  const sheet = workbook.Sheets[name]
  const ref = sheet?.['!ref']
  if (!sheet || !ref) continue
  const range = XLSX.utils.decode_range(ref)
  const availableRows = range.e.r - range.s.r + 1
  const rows = Math.min(availableRows, remainingRows)
  const boundedRange = {
    s: range.s,
    e: { r: range.s.r + rows - 1, c: range.e.c }
  }
  process.stdout.write(`Sheet: ${name}\n`)
  process.stdout.write(XLSX.utils.sheet_to_csv(sheet, { range: boundedRange }))
  process.stdout.write('\n')
  remainingRows -= rows
  if (rows < availableRows) {
    truncated = true
    break
  }
}

if (truncated) process.stdout.write(`\n[Tableur tronqué à ${MAX_ROWS} lignes]\n`)
