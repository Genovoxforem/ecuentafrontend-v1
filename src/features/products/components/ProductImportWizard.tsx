import { useMemo, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, History, LoaderCircle, Trash2, Upload, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import {
  downloadImportFile,
  ImportRefusedError,
  missingMandatory,
  MANDATORY_FIELDS,
  stagedRowsToCsv,
  useCommitImport,
  useImportHistory,
  useImportInit,
  useParseImportFile,
  useProductCount,
  type ImportCommitResult,
  type ImportField,
  type ImportRow,
} from '../productImport.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'
const cellInputCls = 'w-full min-w-[90px] text-xs rounded border border-input-border bg-input-bg text-text px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand/40'
const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50'
const PAGE_SIZE = 25

type StepKey = 'product' | 'uom' | 'stock' | 'price' | 'zra' | 'confirm'

// The classic wizard's own steps and the columns each one edits (columnsByStep).
const STEPS: { key: StepKey; label: string; columns: [ImportField, string][] }[] = [
  {
    key: 'product',
    label: '1. Product',
    columns: [['ref', 'Ref'], ['label', 'Label'], ['description', 'Description'], ['type', 'Type (0/1)'], ['for_sale', 'For Sale'], ['for_purchase', 'For Purchase'], ['barcode', 'Barcode'], ['category', 'Category'], ['origin_country', 'Origin Country']],
  },
  { key: 'uom', label: '2. UOM', columns: [['ref', 'Ref'], ['label', 'Label'], ['zra_qty_unit', 'ZRA Qty Unit Code'], ['zra_pkg_unit', 'ZRA Pkg Unit Code'], ['uom_lines', 'Multiple UOM Lines']] },
  {
    key: 'stock',
    label: '3. Stock',
    columns: [['ref', 'Ref'], ['label', 'Label'], ['opening_stock', 'Opening Stock'], ['stock_alert', 'Stock Alert'], ['desired_stock', 'Desired Stock'], ['nature', 'Nature'], ['enable_lots', 'Enable Lots'], ['lot_no', 'Lot/Batch No.'], ['sell_by', 'Sell By Date'], ['eat_by', 'Eat By / Expiry Date']],
  },
  {
    key: 'price',
    label: '4. Price/Tax',
    columns: [
      ['ref', 'Ref'], ['label', 'Label'], ['cost_price', 'Cost Price'], ['price_ttc', 'Price'], ['min_selling_ttc', 'Min Selling TTC'], ['vat', 'VAT %'], ['vat_code', 'VAT Src Code'], ['price_base_type', 'Price Type'],
      ['ipl_cat', 'IPL Category'], ['ipl_rate', 'IPL %'], ['tl_cat', 'TL Category'], ['tl_rate', 'TL %'], ['excise_cat', 'Excise Category'], ['excise_rate', 'Excise %'],
    ],
  },
  { key: 'zra', label: '5. ZRA', columns: [['ref', 'Ref'], ['label', 'Label'], ['zra_class', 'ZRA Class Code'], ['zra_qty_unit', 'Qty Unit'], ['zra_pkg_unit', 'Pkg Unit'], ['manufacturer_tpin', 'Manufacturer TPIN'], ['manufacturer_item_code', 'Manufacturer Item Code']] },
  {
    key: 'confirm',
    label: '6. Confirm',
    columns: [['ref', 'Ref'], ['label', 'Label'], ['price_ttc', 'Price'], ['min_selling_ttc', 'Min Selling TTC'], ['vat', 'VAT %'], ['vat_code', 'VAT Src Code'], ['price_base_type', 'Price Type'], ['opening_stock', 'Opening Stock'], ['zra_class', 'ZRA Class'], ['zra_qty_unit', 'Qty Unit'], ['zra_pkg_unit', 'Pkg Unit'], ['uom_lines', 'Multiple UOM Lines']],
  },
]

// Fixed choices, as the classic wizard's selectFields.
const SELECT_FIELDS: Partial<Record<ImportField, [string, string][]>> = {
  type: [['0', 'Product'], ['1', 'Service']],
  for_sale: [['1', 'Yes'], ['0', 'No']],
  for_purchase: [['1', 'Yes'], ['0', 'No']],
  enable_lots: [['1', 'Yes'], ['0', 'No']],
  nature: [['', '—'], ['1', 'Raw Material'], ['2', 'Finished Good'], ['3', 'Service']],
  price_base_type: [['TTC', 'TTC (Incl. Tax)'], ['HT', 'HT (Excl. Tax)']],
}

const MANDATORY = new Set<ImportField>(MANDATORY_FIELDS.map((f) => f.key))

type Notice = { tone: 'success' | 'error' | 'info'; text: string; details?: string[] }

function NoticeBox({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const tone = notice.tone === 'success' ? 'border-success/40 bg-success-bg text-success-fg' : notice.tone === 'error' ? 'border-danger/40 bg-danger-bg text-danger' : 'border-brand/30 bg-brand/10 text-text'
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{notice.text}</p>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
      {notice.details && notice.details.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto list-disc pl-5 text-xs">
          {notice.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Native rebuild of product/product_import_wizard.php — upload a CSV/XLSX, review
// and correct the staged rows step by step, then create (or update, by ref) the
// products in one transaction through product/ajax/product_import_wizard.php.
export function ProductImportWizard() {
  const init = useImportInit()
  const parse = useParseImportFile()
  const commit = useCommitImport()

  const [tab, setTab] = useState<'upload' | 'previous' | 'export'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [saved, setSaved] = useState({ file: '', name: '' })
  const [step, setStep] = useState(0)
  const [page, setPage] = useState(0)
  const [confirmed, setConfirmed] = useState<Set<StepKey>>(new Set())
  const [warehouseId, setWarehouseId] = useState('')
  const [zraSync, setZraSync] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [result, setResult] = useState<ImportCommitResult | null>(null)
  const [downloading, setDownloading] = useState('')

  const current = STEPS[step]
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const warehouses = init.data?.warehouses ?? []
  const effectiveWarehouse = warehouseId || String(warehouses[0]?.id ?? '')

  // Choices for the unit and VAT code columns, from the wizard's own init call.
  const dynamicOptions = useMemo(() => {
    const d = init.data
    const units = (list: { code: string; label: string }[] | undefined) => (list ?? []).map((u): [string, string] => [u.code, `${u.code} — ${u.label}`])
    return {
      zra_qty_unit: units(d?.qty_units),
      zra_pkg_unit: [['NT', 'NT — None'] as [string, string], ...units(d?.pkg_units).filter(([c]) => c !== 'NT')],
      vat_code: (d?.vat_codes ?? []).map((v): [string, string] => [v.code, `${v.code} (${Number(v.taux)}%)`]),
    } as Partial<Record<ImportField, [string, string][]>>
  }, [init.data])

  function setCell(index: number, field: ImportField, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
    setConfirmed(new Set())
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
    setConfirmed(new Set())
  }

  function handleParse() {
    if (!file) return setNotice({ tone: 'error', text: 'Choose a CSV or XLSX file first.' })
    setNotice(null)
    setResult(null)
    parse.mutate(file, {
      onSuccess: (data) => {
        setRows(data.rows)
        setSaved({ file: data.savedFile, name: data.savedFileName })
        setStep(0)
        setPage(0)
        setConfirmed(new Set())
        setNotice({ tone: 'info', text: `${data.rows.length} row(s) staged from ${file.name}. Review each step, then create the products.` })
      },
      onError: (err) => setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Could not read this file.' }),
    })
  }

  function stepMissing(stepIndex: number) {
    const keys = new Set(STEPS[stepIndex].columns.map(([k]) => k).filter((k) => MANDATORY.has(k)))
    return missingMandatory(rows)
      .map((m) => ({ row: m.row, fields: m.fields.filter((label) => keys.has(MANDATORY_FIELDS.find((f) => f.label === label)!.key)) }))
      .filter((m) => m.fields.length > 0)
  }

  function confirmStep() {
    if (rows.length === 0) return setNotice({ tone: 'error', text: 'No staged rows. Upload a file first.' })
    const missing = stepMissing(step)
    if (missing.length > 0) {
      return setNotice({ tone: 'error', text: `Step ${step + 1}: ${missing.length} row(s) are missing mandatory values.`, details: missing.map((m) => `Row ${m.row}: ${m.fields.join(', ')}`) })
    }
    setConfirmed((prev) => new Set(prev).add(current.key))
    setNotice({ tone: 'success', text: `${current.label} confirmed.` })
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      setPage(0)
    }
  }

  function handleCommit() {
    if (rows.length === 0) return setNotice({ tone: 'error', text: 'No staged rows. Upload a file first.' })
    const missing = missingMandatory(rows)
    if (missing.length > 0) {
      return setNotice({ tone: 'error', text: `${missing.length} row(s) are missing mandatory values — nothing was imported.`, details: missing.map((m) => `Row ${m.row}: ${m.fields.join(', ')}`) })
    }
    setNotice(null)
    commit.mutate(
      { rows, warehouseId: effectiveWarehouse, zraSync, savedFile: saved.file, savedFileName: saved.name },
      {
        onSuccess: (r) => {
          setResult(r)
          setRows([])
          setFile(null)
          setConfirmed(new Set())
          setStep(0)
          setNotice({ tone: 'success', text: `Import finished: ${r.count_created} product(s) created, ${r.count_updated} updated.` })
        },
        onError: (err) =>
          setNotice({
            tone: 'error',
            text: `${err instanceof Error ? err.message : 'The import failed.'} Nothing was imported — fix the rows below and try again.`,
            details: err instanceof ImportRefusedError ? err.details : undefined,
          }),
      },
    )
  }

  async function download(action: 'download_sample' | 'export_current_products', name: string) {
    setDownloading(action)
    try {
      await downloadImportFile(action, name)
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Download failed.' })
    } finally {
      setDownloading('')
    }
  }

  function exportStaged() {
    const blob = new Blob([stagedRowsToCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staged_${saved.name || 'products'}.csv`.replace(/\.(xlsx|xls|csv)\.csv$/i, '.csv')
    a.click()
    URL.revokeObjectURL(url)
  }

  function renderCell(row: ImportRow, index: number, field: ImportField) {
    const value = row[field] ?? ''
    const missing = MANDATORY.has(field) && !value.trim()
    const cls = `${cellInputCls}${missing ? ' border-danger ring-1 ring-danger/40' : ''}`
    const options = SELECT_FIELDS[field] ?? dynamicOptions[field]
    if (options && options.length > 0) {
      const known = options.some(([v]) => v === value)
      return (
        <select value={value} onChange={(e) => setCell(index, field, e.target.value)} className={cls}>
          {!known && <option value={value}>{value || 'Select…'}</option>}
          {options.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      )
    }
    const wide = field === 'description' || field === 'uom_lines' || field === 'label'
    return <input value={value} onChange={(e) => setCell(index, field, e.target.value)} className={`${cls}${wide ? ' min-w-[180px]' : ''}`} />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="!h-auto xl:col-span-2">
          <div className="flex items-center gap-1 border-b border-border mb-3">
            {(
              [
                ['upload', 'Upload CSV / XLSX', Upload],
                ['previous', 'Previous Imports', History],
                ['export', 'Export Current Products', FileSpreadsheet],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm -mb-px border-b-2 ${tab === key ? 'border-brand text-brand font-medium' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {tab === 'upload' && (
            <div className="space-y-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text border border-input-border rounded-md bg-input-bg"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleParse} disabled={!file || parse.isPending} className={`${btn} bg-brand text-white hover:bg-brand-hover`}>
                  {parse.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />} Parse File
                </button>
                <button type="button" onClick={() => void download('download_sample', 'product_import_sample.csv')} disabled={!!downloading} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
                  {downloading === 'download_sample' ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Download Sample
                </button>
                <button type="button" onClick={exportStaged} disabled={rows.length === 0} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
                  <FileSpreadsheet size={14} /> Export Staged
                </button>
              </div>
              <p className="text-xs text-text-faint">
                Mandatory: Ref, Label, ZRA Class Code, ZRA Qty Unit Code, ZRA Pkg Unit Code, Opening Stock, VAT Src Code, Price Type.
                <br />
                Multiple UOM lines format: PACK:BASE:FACTOR:PRICE:BARCODE:NOTE | PACK:BASE:FACTOR. A row whose Ref already exists updates that product.
              </p>
            </div>
          )}

          {tab === 'previous' && <PreviousImports />}
          {tab === 'export' && <ExportCurrent downloading={downloading === 'export_current_products'} onExport={() => void download('export_current_products', 'products_export.csv')} />}
        </Card>

        <Card className="!h-auto">
          <h3 className="text-sm font-semibold text-text! mb-3">Commit Settings</h3>
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Warehouse</span>
              <select value={effectiveWarehouse} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls} disabled={init.isLoading}>
                {init.isLoading && <option>Loading…</option>}
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Update to ZRA</span>
              <select value={zraSync ? '1' : '0'} onChange={(e) => setZraSync(e.target.value === '1')} className={inputCls}>
                <option value="1">Enabled — submit each product to ZRA</option>
                <option value="0">Disabled — create locally only</option>
              </select>
            </label>
            <p className="text-xs text-text-faint">Opening Stock is counted in the packaging unit; it is converted to base units via the UOM factor.</p>
            {init.isError && <p className="text-xs text-danger">{init.error instanceof Error ? init.error.message : 'Could not load the wizard settings.'}</p>}
          </div>
        </Card>
      </div>

      {notice && <NoticeBox notice={notice} onClose={() => setNotice(null)} />}

      {result && (result.created.length > 0 || result.updated.length > 0) && (
        <Card className="!h-auto">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text! mb-2">
            <CheckCircle2 size={15} className="text-success" /> Last import
          </h3>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {result.created.map((c) => (
              <span key={`c${c.product_id}`} className="rounded-md border border-success/40 bg-success-bg px-2 py-0.5 text-success-fg">
                Created {c.ref}
              </span>
            ))}
            {result.updated.map((u) => (
              <span key={`u${u.product_id}`} className="rounded-md border border-border bg-surface-alt px-2 py-0.5 text-text">
                Updated {u.ref}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setStep(i)
              setPage(0)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${i === step ? 'bg-brand text-white border-brand' : 'border-border text-text-muted hover:bg-surface-hover'}`}
          >
            {confirmed.has(s.key) && <CheckCircle2 size={13} className={i === step ? 'text-white' : 'text-success'} />} {s.label}
          </button>
        ))}
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold text-text!">
          Step {step + 1}: {current.label} — inline edit rows below
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface-alt">
                <th className="font-medium px-3 py-2 whitespace-nowrap">Row No</th>
                {current.columns.map(([key, label]) => (
                  <th key={key} className="font-medium px-2 py-2 whitespace-nowrap">
                    {label}
                    {MANDATORY.has(key) && <span className="text-danger">*</span>}
                  </th>
                ))}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={current.columns.length + 2} className="px-3 py-6 text-center text-text-faint italic">
                    No staged rows. Upload a file first.
                  </td>
                </tr>
              ) : (
                visible.map((row, i) => {
                  const index = page * PAGE_SIZE + i
                  return (
                    <tr key={index} className="border-b border-border last:border-0 align-top">
                      <td className="px-3 py-1.5 text-text-muted tabular-nums">{index + 1}</td>
                      {current.columns.map(([key]) => (
                        <td key={key} className="px-2 py-1.5">
                          {renderCell(row, index, key)}
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeRow(index)} title="Remove this row" className="p-1 rounded text-text-faint hover:text-danger hover:bg-danger-bg">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border">
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
            Previous
          </button>
          <button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)} className={`${btn} border border-border text-text hover:bg-surface-hover`}>
            Next
          </button>
          <button type="button" onClick={confirmStep} disabled={rows.length === 0} className={`${btn} bg-success text-white hover:opacity-90`}>
            Confirm Step {step + 1}
          </button>
          <button type="button" onClick={handleCommit} disabled={rows.length === 0 || commit.isPending} className={`${btn} bg-brand text-white hover:bg-brand-hover`}>
            {commit.isPending && <LoaderCircle size={14} className="animate-spin" />} Create Products
          </button>
          {pages > 1 && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded border border-border disabled:opacity-40">
                ‹
              </button>
              Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
              <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded border border-border disabled:opacity-40">
                ›
              </button>
            </div>
          )}
          <span className="ml-auto text-xs text-text-faint">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </Card>
    </div>
  )
}

function PreviousImports() {
  const { data, isLoading, isError, error } = useImportHistory()
  if (isLoading) return <p className="text-sm text-text-faint italic">Loading previous imports…</p>
  if (isError) return <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load previous imports.'}</p>
  if (!data || data.length === 0) return <p className="text-sm text-text-faint italic">No previous imports yet. Files are kept here after a successful import.</p>
  return (
    <div className="overflow-x-auto max-h-72 overflow-y-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
            <th className="font-medium px-2 py-2">Date</th>
            <th className="font-medium px-2 py-2">File</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f) => (
            <tr key={f.name} className="border-b border-border last:border-0">
              <td className="px-2 py-1.5 text-text-muted whitespace-nowrap">{f.date}</td>
              <td className="px-2 py-1.5 text-text!">{f.code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExportCurrent({ downloading, onExport }: { downloading: boolean; onExport: () => void }) {
  const { data: count, isLoading } = useProductCount()
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Download every product ({isLoading ? '…' : count ?? 0}) as a CSV in the import layout — edit it and upload it again to update products in bulk.
      </p>
      <button type="button" onClick={onExport} disabled={downloading} className={`${btn} bg-brand text-white hover:bg-brand-hover`}>
        {downloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Export Current Products
      </button>
    </div>
  )
}
