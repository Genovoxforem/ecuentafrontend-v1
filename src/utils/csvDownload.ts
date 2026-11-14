// A CSV of rows already on screen, built the way the classic Fixed Asset pages build theirs ("⬇ CSV"): header names, then one line
// per row, fields separated by ";" and quoted when they hold a quote, a ";" or a line break, with a byte-order mark so Excel reads it as UTF-8.
export type CsvColumn = [key: string, header: string]

export function buildSemicolonCsv(columns: CsvColumn[], rows: Array<Record<string, unknown>>): string {
  const field = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => c[1]).join(';'), ...rows.map((r) => columns.map((c) => field(r[c[0]])).join(';'))]
  return `﻿${lines.join('\r\n')}`
}

export function downloadSemicolonCsv(filename: string, columns: CsvColumn[], rows: Array<Record<string, unknown>>) {
  const blob = new Blob([buildSemicolonCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}
