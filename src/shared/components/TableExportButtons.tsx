import { FileSpreadsheet, Printer, FileText } from 'lucide-react'

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface ExportTableData {
  headers: string[]
  rows: string[][]
}

const btnCls = 'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:brightness-95'

// Inline CSV/Excel/Print/PDF row (reference DataTables-style button group)
// used after the search box on every list table — one click per format
// instead of the old single dropdown menu.
export function TableExportButtons({ title, getExportData }: { title: string; getExportData: () => ExportTableData | Promise<ExportTableData> }) {
  const filenameBase = title.replace(/\s+/g, '-').toLowerCase()

  // The rows may be read from the server first (a list read page by page); a plain array is used at once.
  function withData(run: (data: ExportTableData) => void, onFail?: () => void): void | Promise<void> {
    const result = getExportData()
    if (!(result instanceof Promise)) return run(result)
    return result.then(run, (e) => {
      onFail?.()
      throw e
    })
  }

  function handleCsv() {
    void withData(({ headers, rows }) => {
      const toCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
      const csv = [headers, ...rows].map((row) => row.map(toCell).join(',')).join('\r\n')
      downloadBlob(`${filenameBase}.csv`, 'text/csv;charset=utf-8;', csv)
    })
  }

  // .xls extension + application/vnd.ms-excel MIME on a plain HTML table —
  // Excel opens this natively (a common lightweight export trick), no xlsx
  // library dependency needed for a real, working "Excel" export.
  function handleExcel() {
    void withData(({ headers, rows }) => {
      const html = `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows
        .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>`
      downloadBlob(`${filenameBase}.xls`, 'application/vnd.ms-excel', html)
    })
  }

  // Print and PDF share the same print-friendly popup: every modern browser's
  // print dialog offers "Save as PDF" as a destination, so this gives a real,
  // working PDF export with no extra library.
  function handlePrint() {
    // Opened first: a browser only allows the pop-up while the click is still being handled, and the rows may take a moment (a list read page by page).
    const win = window.open('', '_blank')
    if (!win) return
    // BUG-112: keep the reference to write the page, but cut the link back to the app.
    win.opener = null
    void withData(
      ({ headers, rows }) => {
        win.document.write(`<html><head><title>${escapeHtml(title)}</title><style>
      body { font-family: sans-serif; padding: 24px; color: #111; }
      h2 { margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f3f4f6; }
    </style></head><body>
    <h2>${escapeHtml(title)}</h2>
    <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>
    </body></html>`)
        win.document.close()
        win.focus()
        win.print()
      },
      () => win.close(),
    )
  }

  return (
    <div className="blue-density-export flex items-center gap-1.5">
      <button type="button" onClick={handleCsv} title="Export CSV" className={`${btnCls} bg-transparent text-info-fg`}>
        <FileSpreadsheet size={14} /> CSV
      </button>
      <button type="button" onClick={handleExcel} title="Export Excel" className={`${btnCls} bg-transparent text-success-fg`}>
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button type="button" onClick={handlePrint} title="Print" className={`${btnCls} bg-transparent text-neutral-fg`}>
        <Printer size={14} /> Print
      </button>
      <button type="button" onClick={handlePrint} title="Export PDF" className={`${btnCls} bg-transparent text-danger-fg`}>
        <FileText size={14} /> PDF
      </button>
    </div>
  )
}
