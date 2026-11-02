// Spreadsheet side of the classic Medicines "Import": reading the uploaded .xlsx / .csv (worksheet, header row, formula cells),
// and writing the three files it offers (Excel template, error workbook, results workbook). Uses exceljs, loaded on demand.
export const MAX_IMPORT_MB = 8

export interface ImportTemplateData {
  purpose: string
  title: string
  instructions: string[]
  header: string[]
  example: string[]
  fields: { key: string; label: string; required?: boolean; regulatory?: boolean; enum?: string[]; help?: string }[]
}

export interface PickedSheet {
  headers: string[]
  rows: Record<string, string>[]
  formulaCells: string[]
}
export interface ParsedBook {
  sheetNames: string[]
  pick: (sheet: string, headerRow: number) => PickedSheet
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// RFC 4180 style CSV -> rows of strings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function pickFromGrid(grid: string[][], headerRow: number, formulaCells: string[]): PickedSheet {
  const headers = (grid[Math.max(0, headerRow - 1)] ?? []).map((h) => String(h ?? '').trim())
  const rows: Record<string, string>[] = []
  for (let r = Math.max(0, headerRow - 1) + 1; r < grid.length; r++) {
    const line = grid[r] ?? []
    const obj: Record<string, string> = {}
    let any = false
    headers.forEach((h, c) => {
      if (h === '') return
      const v = line[c] == null ? '' : String(line[c]).trim()
      obj[h] = v
      if (v !== '') any = true
    })
    if (any) rows.push(obj)
  }
  return { headers, rows, formulaCells }
}

export async function readSpreadsheet(file: File): Promise<ParsedBook> {
  if (/\.(xlsm|xlsb|xltm)$/i.test(file.name)) throw new Error('Macro-enabled workbooks are not allowed. Save as .xlsx or .csv and try again.')
  if (/\.xls$/i.test(file.name)) throw new Error('Old .xls files cannot be read here. Save as .xlsx or .csv and try again.')
  if (/\.csv$/i.test(file.name)) {
    const grid = parseCsv(await file.text())
    return { sheetNames: ['Sheet1'], pick: (_s, headerRow) => pickFromGrid(grid, headerRow, []) }
  }
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const sheets = new Map<string, { grid: string[][]; formulas: string[] }>()
  wb.eachSheet((ws) => {
    const grid: string[][] = []
    const formulas: string[] = []
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const line: string[] = []
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        line[col - 1] = cell.text ?? ''
        const v = cell.value as unknown
        if (v && typeof v === 'object' && ('formula' in (v as object) || 'sharedFormula' in (v as object))) formulas.push(cell.address)
      })
      grid[rowNumber - 1] = line
    })
    sheets.set(ws.name, { grid, formulas })
  })
  return {
    sheetNames: [...sheets.keys()],
    pick: (name, headerRow) => {
      const s = sheets.get(name)
      return s ? pickFromGrid(s.grid, headerRow, s.formulas) : { headers: [], rows: [], formulaCells: [] }
    },
  }
}

// FNV-1a over the file bytes: the file hash the server stores with an import.
export async function fileHash(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let h = 2166136261
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i] ?? 0
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

// "Download Excel template": an Instructions sheet (rules + COLUMN / REQUIRED / ALLOWED) and a Data sheet (headers + an example row).
export async function downloadImportTemplate(t: ImportTemplateData) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ins = wb.addWorksheet('Instructions')
  t.instructions.forEach((line) => ins.addRow([line]))
  ins.addRow([''])
  const head = ins.addRow(['COLUMN', 'REQUIRED', 'ALLOWED / NOTES'])
  head.font = { bold: true }
  t.fields.forEach((f) => ins.addRow([f.label + (f.regulatory ? '  (regulatory — pharmacist-verified)' : ''), f.required ? 'YES' : '', f.enum?.length ? 'one of: ' + f.enum.join(', ') : (f.help ?? '')]))
  ins.columns = [{ width: 42 }, { width: 10 }, { width: 70 }]
  const data = wb.addWorksheet('Data')
  const hdr = data.addRow(t.header.map((h, i) => (t.fields[i]?.required ? h + ' ✱' : h)))
  hdr.font = { bold: true }
  data.addRow(t.example)
  data.columns = t.header.map((h) => ({ width: Math.max(14, h.length + 3) }))
  data.eachRow((row) => row.eachCell((cell) => ((cell.numFmt = '@'), (cell.value = cell.value == null ? '' : String(cell.value)))))
  downloadBlob(new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_TYPE }), `pharmacy-import-${t.purpose}-template.xlsx`)
}

export async function downloadRowsWorkbook(filename: string, sheetName: string, rows: (string | number)[][], widths: number[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)
  rows.forEach((r) => ws.addRow(r))
  ws.getRow(1).font = { bold: true }
  ws.columns = widths.map((w) => ({ width: w }))
  downloadBlob(new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_TYPE }), filename)
}
