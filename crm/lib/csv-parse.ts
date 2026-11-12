/**
 * A small CSV reader (RFC 4180): quoted fields, commas and line breaks inside quotes, "" for a quote, CRLF or LF,
 * a leading byte-order mark. The separator is guessed from the first line: comma, semicolon (common in Hebrew and
 * European Excel exports) or tab. Pure, no dependencies.
 */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  let line = ''
  let quoted = false
  for (const ch of text) {
    if (ch === '"') quoted = !quoted
    if (!quoted && (ch === '\n' || ch === '\r')) break
    line += ch
  }
  let best: ',' | ';' | '\t' = ','
  let bestCount = 0
  for (const d of [',', ';', '\t'] as const) {
    let n = 0
    let q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (!q && ch === d) n += 1
    }
    if (n > bestCount) {
      best = d
      bestCount = n
    }
  }
  return best
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const delim = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let touched = false
  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    // a completely empty line is not a row
    if (row.length > 1 || row[0] !== '' || touched) rows.push(row)
    row = []
    touched = false
  }
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"' && field === '') {
      quoted = true
      touched = true
    } else if (ch === delim) {
      endField()
      touched = true
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1
      endRow()
    } else if (ch === '\n') {
      endRow()
    } else field += ch
  }
  if (field !== '' || row.length > 0 || touched) endRow()
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}
