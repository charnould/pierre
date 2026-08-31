#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

XLSX.set_cptable(cpexcel)

const path = process.argv[2]
if (!path) {
  console.error('usage: extract-spreadsheet FILE')
  process.exit(1)
}

const workbook = XLSX.read(readFileSync(path))
const parts = []

for (const name of workbook.SheetNames) {
  parts.push(`Sheet: ${name}`)
  parts.push(XLSX.utils.sheet_to_csv(workbook.Sheets[name]))
}

process.stdout.write(parts.join('\n\n'))
