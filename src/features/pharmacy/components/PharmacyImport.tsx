import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { PharmacyApiError } from '../pharmacy.api'
import { importCommit, importTemplate, importValidate, type ImportCommit, type ImportCounts, type ImportField, type ImportPurpose, type ImportRow } from '../pharmacy.actions'
import { MAX_IMPORT_MB, downloadImportTemplate, downloadRowsWorkbook, fileHash, readSpreadsheet, type ImportTemplateData, type ParsedBook, type PickedSheet } from '../pharmacyImportFiles'
import { pharmacyToast } from '../pharmacyToast'
import { CancelButton, FIELD, PrimaryButton, Sheet } from './PharmacyForms'
import { Pill } from './PharmacyUi'

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map columns' },
  { id: 'validate', label: 'Validate' },
  { id: 'review', label: 'Review' },
  { id: 'results', label: 'Results' },
] as const
type StepId = (typeof STEPS)[number]['id']

const PURPOSES: { id: ImportPurpose; title: string; sub: string }[] = [
  { id: 'new', title: 'Add new medicines', sub: 'Create catalogue entries' },
  { id: 'update', title: 'Update existing medicines', sub: 'Edit by SKU / barcode' },
  { id: 'receive', title: 'Receive medicine stock', sub: 'Batch + expiry goods receipt' },
]

// "Template" button: the Excel template for adding new medicines.
export async function downloadMedicineTemplate() {
  try {
    const t = await importTemplate('new')
    await downloadImportTemplate({ purpose: 'new', title: t.title, instructions: t.instructions, header: t.header, example: t.example, fields: t.fields })
  } catch (e) {
    pharmacyToast(e instanceof PharmacyApiError ? e.message : 'Could not download the template', true)
  }
}

// Fuzzy header match the classic wizard uses: exact normalised match first, then "contains" either way.
function autoMatch(headers: string[], names: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_./-]+/g, ' ').trim()
  const hs = headers.map((raw) => ({ raw, n: norm(raw) }))
  const wanted = names.map(norm)
  for (const w of wanted) {
    const hit = hs.find((h) => h.n === w)
    if (hit) return hit.raw
  }
  for (const w of wanted) {
    const hit = hs.find((h) => h.n.includes(w) || w.includes(h.n))
    if (hit) return hit.raw
  }
  return ''
}

const issueText = (r: ImportRow) => {
  const first = r.issues[0] ?? r.warnings[0]
  const more = r.issues.length + (r.warnings?.length ?? 0) - 1
  return `${first ? `${first.column}: ${first.issue}${first.suggestion ? ' → ' + first.suggestion : ''}` : ''}${more > 0 ? ` (+${more} more)` : ''}`
}

export function ImportSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [purpose, setPurpose] = useState<ImportPurpose>('new')
  const [step, setStep] = useState<StepId>('upload')
  const [busy, setBusy] = useState(false)
  const [tpl, setTpl] = useState<ImportTemplateData | null>(null)
  const [fields, setFields] = useState<ImportField[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [book, setBook] = useState<ParsedBook | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [headerRow, setHeaderRow] = useState(1)
  const [picked, setPicked] = useState<PickedSheet | null>(null)
  const [hash, setHash] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [warehouse, setWarehouse] = useState('')
  const [validated, setValidated] = useState<ImportRow[]>([])
  const [counts, setCounts] = useState<ImportCounts | null>(null)
  const [filter, setFilter] = useState('all')
  const [result, setResult] = useState<ImportCommit | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // the template (fields, example) depends on the purpose
  useEffect(() => {
    let live = true
    importTemplate(purpose)
      .then((t) => {
        if (!live) return
        setFields(t.fields ?? [])
        setTpl({ purpose, title: t.title, instructions: t.instructions, header: t.header, example: t.example, fields: t.fields ?? [] })
      })
      .catch(() => live && pharmacyToast('Could not load the import template', true))
    return () => {
      live = false
    }
  }, [purpose])

  // re-read the chosen worksheet / header row and re-run the automatic column mapping
  useEffect(() => {
    if (!book || !sheetName) return setPicked(null)
    const p = book.pick(sheetName, headerRow)
    setPicked(p)
    if (fields.length) {
      const m: Record<string, string> = {}
      for (const f of fields) {
        const hit = autoMatch(p.headers, f.aliases?.length ? f.aliases : [f.label, f.key])
        if (hit) m[f.key] = hit
      }
      setMapping(m)
    }
  }, [book, sheetName, headerRow, fields])

  async function load(f: File | null) {
    if (!f) return
    if (f.size > MAX_IMPORT_MB * 1024 * 1024) return pharmacyToast(`File is larger than ${MAX_IMPORT_MB} MB. Split it and try again.`, true)
    setBusy(true)
    try {
      const b = await readSpreadsheet(f)
      setHash(await fileHash(f))
      setFile(f)
      setBook(b)
      setSheetName(b.sheetNames.find((n) => n.toLowerCase() === 'data') ?? b.sheetNames[0] ?? '')
      setHeaderRow(1)
    } catch (e) {
      pharmacyToast(e instanceof Error ? e.message : 'Could not read the file', true)
    } finally {
      setBusy(false)
    }
  }

  const missing = useMemo(() => fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label), [fields, mapping])
  const duplicated = useMemo(() => {
    const seen: Record<string, number> = {}
    Object.values(mapping).forEach((h) => h && (seen[h] = (seen[h] ?? 0) + 1))
    return Object.entries(seen).filter(([, n]) => n > 1).map(([h]) => h)
  }, [mapping])
  const hasFormulas = (picked?.formulaCells.length ?? 0) > 0
  const uid = useMemo(() => `imp-${purpose}-${hash}`.slice(0, 40), [purpose, hash])
  const totalApplied = counts ? counts.create + counts.update + counts.receive : 0

  async function validate() {
    if (!picked) return
    setBusy(true)
    try {
      const r = await importValidate(purpose, picked.rows, mapping)
      setValidated(r.rows ?? [])
      setCounts(r.counts)
      setFilter('all')
      setStep('validate')
    } catch (e) {
      pharmacyToast(e instanceof PharmacyApiError ? e.message : 'Validation failed', true)
    } finally {
      setBusy(false)
    }
  }
  async function commit() {
    if (!picked) return
    setBusy(true)
    try {
      const r = await importCommit({ purpose, rows: picked.rows, mapping, importUid: uid, warehouse, filename: file?.name ?? '', fileHash: hash, sheet: sheetName })
      setResult(r)
      setStep('results')
      onDone()
      pharmacyToast(`Import ${r.status}: ${r.counts.created + r.counts.updated + r.counts.received} applied, ${r.counts.rejected} rejected`, r.counts.rejected > 0)
    } catch (e) {
      pharmacyToast(e instanceof PharmacyApiError ? e.message : 'Import failed', true)
    } finally {
      setBusy(false)
    }
  }

  const shown = validated.filter((r) => (filter === 'errors' ? r.action === 'reject' : filter === 'warnings' ? (r.warnings?.length ?? 0) > 0 : filter === 'new' ? r.action === 'create' : filter === 'updates' ? r.action === 'update' : true))
  const cur = STEPS.findIndex((s) => s.id === step)
  const sample = (header?: string) => (header && picked?.rows[0] ? (picked.rows[0][header] ?? '') : '')

  async function errorWorkbook() {
    if (!picked) return
    const heads = picked.headers.filter(Boolean)
    const lines: (string | number)[][] = [[...heads, '_Issues']]
    validated.filter((r) => r.action === 'reject').forEach((r) => {
      const src = picked.rows[r.row_no - 2] ?? {}
      lines.push([...heads.map((h) => src[h] ?? ''), r.issues.map((i) => `${i.column}: ${i.issue}${i.suggestion ? ' → ' + i.suggestion : ''}`).join(' | ')])
    })
    await downloadRowsWorkbook(`pharmacy-import-${purpose}-errors.xlsx`, 'Errors', lines, [...heads.map((h) => Math.max(14, h.length + 3)), 60])
  }
  async function resultsWorkbook() {
    if (!result) return
    const lines: (string | number)[][] = [['Row', 'Action', 'Status', 'Product ID', 'GRN ID', 'Message']]
    result.results.forEach((r) => lines.push([r.row_no, r.action, r.status, r.fk_product ?? '', r.fk_grn ?? '', r.message]))
    await downloadRowsWorkbook(`pharmacy-import-${purpose}-results.xlsx`, 'Results', lines, [6, 10, 10, 11, 9, 50])
  }

  const pill = (r: ImportRow) => (r.action === 'reject' ? <Pill tone="bad">rejected</Pill> : r.action === 'create' ? <Pill tone="ok">new</Pill> : r.action === 'update' ? <Pill tone="info">update</Pill> : <Pill tone="ok">receive</Pill>)
  const FilterBtn = ({ k }: { k: string }) => (
    <button type="button" onClick={() => setFilter(k)} className={`h-8 rounded-lg border px-3 text-xs font-semibold ${filter === k ? 'border-transparent bg-(--color-brand) text-white' : 'border-border text-text hover:bg-surface-hover'}`}>{k}</button>
  )
  const back: Partial<Record<StepId, StepId>> = { map: 'upload', validate: 'map', review: 'validate' }

  const footer = (
    <>
      <CancelButton onClick={onClose} />
      <div className="flex-1" />
      {back[step] && <button type="button" onClick={() => setStep(back[step] as StepId)} className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-text hover:bg-surface-hover">Back</button>}
      {step === 'upload' && <PrimaryButton disabled={!picked || picked.rows.length === 0 || hasFormulas || busy} onClick={() => setStep('map')}>Map columns</PrimaryButton>}
      {step === 'map' && <PrimaryButton disabled={missing.length > 0 || busy} onClick={() => void validate()}>{busy ? 'Validating…' : 'Validate'}</PrimaryButton>}
      {step === 'validate' && <PrimaryButton disabled={busy || !counts || totalApplied === 0} onClick={() => setStep('review')}>Review</PrimaryButton>}
      {step === 'review' && <PrimaryButton disabled={busy} onClick={() => void commit()}>{busy ? 'Importing…' : `Import ${totalApplied} rows`}</PrimaryButton>}
      {step === 'results' && <PrimaryButton onClick={onClose}>Done</PrimaryButton>}
    </>
  )

  return (
    <Sheet title="Import medicines" onClose={onClose} footer={footer} wide>
      <ol className="mb-4 flex gap-1 text-xs" aria-label="Import steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 ${i === cur ? 'bg-brand/15 font-semibold text-brand' : i < cur ? 'text-success-fg' : 'text-text-faint'}`}>
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs">{i < cur ? '✓' : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {PURPOSES.map((p) => (
              <button key={p.id} type="button" onClick={() => setPurpose(p.id)} className={`rounded-xl border p-3 text-left ${purpose === p.id ? 'border-brand bg-brand/10' : 'border-border hover:bg-surface-hover'}`}>
                <b className="block text-sm text-text!">{p.title}</b>
                <small className="text-text-faint">{p.sub}</small>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-info-bg px-4 py-2.5 text-sm text-info-fg">
            <span>Start from the formatted template — correct columns, example row and allowed values.</span>
            <button type="button" disabled={!tpl} onClick={() => tpl && void downloadImportTemplate(tpl)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 text-xs font-semibold text-text hover:bg-surface-hover disabled:opacity-50"><Download size={13} /> Download Excel template</button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); void load(e.dataTransfer.files?.[0] ?? null) }}
            onClick={() => input.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center ${over ? 'border-brand bg-brand/10' : 'border-border'}`}
          >
            <Upload size={26} className="text-text-faint" />
            <div className="text-sm font-semibold text-text!">{file ? file.name : 'Drag an .xlsx or .csv here, or click to browse'}</div>
            <div className="text-xs text-text-faint">Up to {MAX_IMPORT_MB} MB · up to 5,000 rows · no macros or formulas</div>
            <input ref={input} type="file" accept=".xlsx,.csv,.xls" hidden onChange={(e) => void load(e.target.files?.[0] ?? null)} />
          </div>
          {book && (
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_1fr]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">Worksheet
                <select value={sheetName} onChange={(e) => setSheetName(e.target.value)} className={`${FIELD} mt-1 normal-case`}>
                  {book.sheetNames.map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-faint">Header row
                <input type="number" min={1} value={headerRow} onChange={(e) => setHeaderRow(Math.max(1, Number(e.target.value) || 1))} className={`${FIELD} mt-1`} />
              </label>
              <div className="text-sm text-text-muted">
                {picked ? `${picked.headers.length} columns · ${picked.rows.length} data rows` : 'Reading…'}
                {hasFormulas && <div className="text-danger-fg">This sheet has {picked?.formulaCells.length} formula cell(s). Paste as values before importing.</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'map' && picked && (
        <div className="space-y-3">
          {missing.length > 0 && <div className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">Required columns not mapped: {missing.join(', ')}</div>}
          {duplicated.length > 0 && <div className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">A source column is mapped more than once: {duplicated.join(', ')}</div>}
          <table className="w-full text-sm">
            <thead><tr><th className="text-left">Destination field</th><th className="text-left">Spreadsheet column</th><th className="text-left">Sample</th></tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key}>
                  <td>{f.label}{f.required && <span className="ml-1 text-danger-fg">✱</span>}{f.regulatory && <span className="ml-2"><Pill tone="info">regulatory</Pill></span>}</td>
                  <td>
                    <select value={mapping[f.key] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))} className={`${FIELD} h-8`}>
                      <option value="">— not mapped —</option>
                      {picked.headers.filter(Boolean).map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                  <td className="text-text-faint">{sample(mapping[f.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step === 'validate' && counts && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {purpose === 'receive' ? <Pill tone="ok">{counts.receive} to receive</Pill> : <><Pill tone="ok">{counts.create} new</Pill><Pill tone="info">{counts.update} updates</Pill></>}
            <Pill tone="warn">{counts.warn} warnings</Pill>
            <Pill tone="bad">{counts.reject} rejected</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'errors', 'warnings', 'new', 'updates'].filter((k) => !(purpose === 'receive' && (k === 'new' || k === 'updates'))).map((k) => <FilterBtn key={k} k={k} />)}
            {counts.reject > 0 && <button type="button" onClick={() => void errorWorkbook()} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-text hover:bg-surface-hover"><Download size={13} /> Error workbook</button>}
          </div>
          <table className="w-full text-sm">
            <thead><tr><th className="text-left">Row</th><th className="text-left">Outcome</th><th className="text-left">Match</th><th className="text-left">Issue / warning</th></tr></thead>
            <tbody>
              {shown.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-text-faint">Nothing in this filter.</td></tr> : shown.map((r) => (
                <tr key={r.row_no} className={r.action === 'reject' ? 'bg-danger-bg/40' : ''}>
                  <td className="tabular-nums">{r.row_no}</td>
                  <td>{pill(r)}{r.action !== 'reject' && (r.warnings?.length ?? 0) > 0 && <span className="ml-1.5"><Pill tone="warn">warn</Pill></span>}</td>
                  <td>{r.match_label || '—'}</td>
                  <td className="text-text-muted">{issueText(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step === 'review' && counts && (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-info-bg px-3 py-2 text-info-fg">Confirm before importing. Rejected rows are skipped; regulatory classifications are imported as proposed and wait for pharmacist verification.</div>
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
            <dt className="text-text-faint">Purpose</dt><dd className="font-medium text-text!">{PURPOSES.find((p) => p.id === purpose)?.title}</dd>
            <dt className="text-text-faint">File</dt><dd className="font-medium text-text!">{file?.name} · {picked?.rows.length} rows</dd>
            {purpose === 'receive' && <><dt className="text-text-faint">Default warehouse</dt><dd><input className={`${FIELD} max-w-80`} placeholder="Warehouse name or ID — blank uses the default" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} /></dd></>}
          </dl>
          <div className="flex flex-wrap gap-2">
            {purpose === 'receive' ? <Pill tone="ok">{counts.receive} receipts</Pill> : <><Pill tone="ok">{counts.create} to create</Pill><Pill tone="info">{counts.update} to update</Pill></>}
            <Pill tone="warn">{counts.warn} with warnings</Pill>
            <Pill tone="bad">{counts.reject} rejected (skipped)</Pill>
          </div>
          {purpose === 'receive' && <p className="text-xs text-text-faint">Each receipt posts a GRN document and a batch stock movement — stock changes only here, never on catalogue imports.</p>}
        </div>
      )}

      {step === 'results' && result && (
        <div className="space-y-3">
          <div className={`text-lg font-bold ${result.status === 'done' ? 'text-success-fg' : result.status === 'partial' ? 'text-warning-fg' : 'text-danger-fg'}`}>
            {result.status === 'done' ? 'Import complete' : result.status === 'partial' ? 'Imported with rejections' : 'Import failed'}
          </div>
          <div className="flex flex-wrap gap-2">
            {result.counts.created > 0 && <Pill tone="ok">{result.counts.created} created</Pill>}
            {result.counts.updated > 0 && <Pill tone="info">{result.counts.updated} updated</Pill>}
            {result.counts.received > 0 && <Pill tone="ok">{result.counts.received} received</Pill>}
            {result.counts.skipped > 0 && <Pill>{result.counts.skipped} skipped</Pill>}
            {result.counts.rejected > 0 && <Pill tone="bad">{result.counts.rejected} rejected</Pill>}
          </div>
          <button type="button" onClick={() => void resultsWorkbook()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-text hover:bg-surface-hover"><Download size={13} /> Download results</button>
          <table className="w-full text-sm">
            <thead><tr><th className="text-left">Row</th><th className="text-left">Action</th><th className="text-left">Status</th><th className="text-left">Record</th><th className="text-left">Message</th></tr></thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.row_no} className={r.status === 'rejected' ? 'bg-danger-bg/40' : ''}>
                  <td className="tabular-nums">{r.row_no}</td><td>{r.action}</td><td>{r.status}</td>
                  <td>{r.fk_grn ? `GRN #${r.fk_grn}` : r.fk_product ? `#${r.fk_product}` : '—'}</td>
                  <td className="text-text-muted">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Sheet>
  )
}
