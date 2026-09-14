export type CsvRecord = { fields: string[]; line: number }

/** Incremental RFC 4180 parser using semicolons as delimiters. */
export class CsvRecordParser {
  readonly #records: CsvRecord[] = []
  #fields: string[] = []
  #field = ''
  #state: 'unquoted' | 'quoted' | 'after_quote' = 'unquoted'
  #line = 1
  #recordLine = 1
  #lastWasCr = false

  push(chunk: string): CsvRecord[] {
    for (const character of chunk) this.#pushCharacter(character)
    return this.#drain()
  }

  finish(): CsvRecord[] {
    if (this.#state === 'quoted') {
      throw new Error(`CSV line ${this.#recordLine}: unterminated quoted field`)
    }
    if (this.#fields.length > 0 || this.#field !== '' || this.#state === 'after_quote') {
      this.#emitRecord()
    }
    return this.#drain()
  }

  #pushCharacter(character: string): void {
    if (this.#lastWasCr) {
      this.#lastWasCr = false
      if (character === '\n') return
    }

    if (this.#state === 'quoted') {
      if (character === '"') this.#state = 'after_quote'
      else {
        this.#field += character
        if (character === '\n') this.#line++
      }
      return
    }

    if (this.#state === 'after_quote') {
      if (character === '"') {
        this.#field += '"'
        this.#state = 'quoted'
        return
      }
      if (character !== ';' && character !== '\n' && character !== '\r') {
        throw new Error(`CSV line ${this.#line}: unexpected character after closing quote`)
      }
      this.#state = 'unquoted'
    }

    if (character === ';') {
      this.#fields.push(this.#field)
      this.#field = ''
    } else if (character === '\n' || character === '\r') {
      this.#emitRecord()
      this.#line++
      if (character === '\r') this.#lastWasCr = true
      this.#recordLine = this.#line
    } else if (character === '"') {
      if (this.#field !== '') {
        throw new Error(`CSV line ${this.#line}: quote inside an unquoted field`)
      }
      this.#state = 'quoted'
    } else {
      this.#field += character
    }
  }

  #emitRecord(): void {
    this.#fields.push(this.#field)
    this.#records.push({ fields: this.#fields, line: this.#recordLine })
    this.#fields = []
    this.#field = ''
  }

  #drain(): CsvRecord[] {
    return this.#records.splice(0)
  }
}

export const parse_csv_line = (line: string): string[] => {
  const parser = new CsvRecordParser()
  const records = [...parser.push(line), ...parser.finish()]
  if (records.length !== 1) throw new Error('Expected exactly one CSV record')
  return records[0]!.fields
}
