import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Columns3, FileDown, FileUp, ListChecks, Loader2, Save, Search, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListPagination } from '../../../shared/components/ListPagination'
import { listAllProducts, updateProductPrice, type ProductListItem } from '../../../api/products'
import { useCategories } from '../../customers/categories.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { LegacyErrorCard, LegacyLoadingCard } from './LegacyReportStates'

const cell = 'w-full !h-8 !min-h-0 !py-0 !text-xs rounded border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60'

type Mode = 'absolute' | 'percentage'

// Price a row would get from what was typed: the amount itself (absolute) or the
// current price changed by that percentage.
export function nextPrice(current: number, typed: string, mode: Mode): number | null {
  if (typed.trim() === '') return null
  const n = Number(typed)
  if (!Number.isFinite(n)) return null
  const next = mode === 'percentage' ? current * (1 + n / 100) : n
  return next < 0 ? null : Math.round(next * 100) / 100
}

const currentOf = (p: ProductListItem) => (p.price_base_type === 'TTC' ? p.price_ttc : p.price)

// Product Price Update, laid out like the classic product/price_update.php: title
// with "View Price Lists", Export / Import Excel (no JSON API yet, so locked),
// category chips, a toolbar (page size, search, Absolute / Percentage), the
// catalogue grouped by tag with one editable selling price and an Update button
// per row, and a green "Update Prices" for the ticked rows. Saves go through
// product/fapi/prices.php, in each product's own price base.
export function ProductPriceUpdatePage() {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories(0)
  const { data: products, isLoading, isError, error, refetch } = useQuery({ queryKey: ['products', 'priceUpdate'], queryFn: () => listAllProducts({}), staleTime: 1000 * 30 })
  const [picked, setPicked] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<Mode>('absolute')
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [ticked, setTicked] = useState<Set<number>>(new Set())
  const [rowState, setRowState] = useState<Record<number, 'saving' | 'saved' | string>>({})
  const [perPage, setPerPage] = useState(100)
  const [page, setPage] = useState(1)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [note, setNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const save = useMutation({
    mutationFn: (p: ProductListItem & { next: number }) =>
      updateProductPrice({ id: p.id, price: p.next, price_base_type: p.price_base_type === 'TTC' ? 'TTC' : 'HT', tva_tx: p.tva_tx, default_vat_code: p.default_vat_code || undefined }),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? [])
      .filter((p) => picked.length === 0 || p.categories.some((c) => picked.includes(c.id)))
      .filter((p) => !q || p.ref.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
      .sort((a, b) => (a.categories[0]?.label ?? '\uffff').localeCompare(b.categories[0]?.label ?? '\uffff') || a.label.localeCompare(b.label))
  }, [products, picked, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)
  const unpicked = (categories?.items ?? []).filter((c) => !picked.includes(c.id))
  const valueOf = (p: ProductListItem) => typed[p.id] ?? (mode === 'absolute' ? String(currentOf(p)) : '')
  const changed = (p: ProductListItem) => typed[p.id] !== undefined && nextPrice(currentOf(p), typed[p.id], mode) !== null

  async function saveRow(p: ProductListItem): Promise<boolean> {
    const next = nextPrice(currentOf(p), typed[p.id] ?? '', mode)
    if (next === null) {
      setRowState((s) => ({ ...s, [p.id]: 'Enter a valid price.' }))
      return false
    }
    setRowState((s) => ({ ...s, [p.id]: 'saving' }))
    try {
      await save.mutateAsync({ ...p, next })
      setRowState((s) => ({ ...s, [p.id]: 'saved' }))
      setTyped((t) => Object.fromEntries(Object.entries(t).filter(([k]) => Number(k) !== p.id)))
      return true
    } catch (e) {
      setRowState((s) => ({ ...s, [p.id]: e instanceof Error ? e.message : 'Could not update the price.' }))
      return false
    }
  }

  async function saveTicked() {
    setBulkBusy(true)
    for (const p of filtered.filter((r) => ticked.has(r.id) && changed(r))) await saveRow(p)
    setBulkBusy(false)
    setTicked(new Set())
    void queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  // Export: every listed product (the current filters), with its own price base.
  async function exportSheet() {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Prices')
    ws.addRow(['Ref', 'Label', 'Category', 'Price base', 'Selling Price'])
    for (const p of filtered) ws.addRow([p.ref, p.label, p.categories[0]?.label ?? '', p.price_base_type === 'TTC' ? 'Inc. tax' : 'Excl. tax', currentOf(p)])
    ws.columns = [{ width: 16 }, { width: 36 }, { width: 22 }, { width: 12 }, { width: 14 }]
    const buffer = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `product_prices_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setNote(`Exported ${filtered.length} product(s).`)
  }

  // Import: Ref + Selling Price columns fill the new prices (and tick the rows);
  // nothing is saved until Update / Update Prices is pressed.
  async function importSheet(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file || !products) return
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      const table: string[][] = []
      ws?.eachRow((row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : []
        table.push(values.map((v) => (v == null ? '' : typeof v === 'object' && 'text' in v ? String(v.text) : typeof v === 'object' && 'result' in v ? String(v.result) : String(v))))
      })
      const header = (table[0] ?? []).map((h) => h.trim().toLowerCase())
      const refCol = header.indexOf('ref')
      const priceCol = header.findIndex((h) => h.startsWith('selling price') || h === 'price')
      if (refCol < 0 || priceCol < 0) return setNote('The sheet needs a "Ref" and a "Selling Price" column.')
      const byRef = new Map(products.map((p) => [p.ref.trim().toLowerCase(), p]))
      const nextTyped: Record<number, string> = {}
      let unknown = 0
      for (const row of table.slice(1)) {
        const p = byRef.get((row[refCol] ?? '').trim().toLowerCase())
        const n = Number(row[priceCol])
        if (!p || row[priceCol] === '' || !Number.isFinite(n)) {
          if (row[refCol]) unknown += 1
          continue
        }
        if (n !== currentOf(p)) nextTyped[p.id] = String(n)
      }
      setMode('absolute')
      setTyped(nextTyped)
      setTicked(new Set(Object.keys(nextTyped).map(Number)))
      setNote(`${Object.keys(nextTyped).length} price(s) loaded from the sheet${unknown ? `, ${unknown} row(s) skipped (unknown ref or no price)` : ''}. Press Update Prices to save.`)
    } catch {
      setNote('Could not read that file — use an .xlsx exported from here.')
    }
  }

  let lastGroup: string | null = null
  const pageIds = pageRows.map((p) => p.id)
  const allTicked = pageIds.length > 0 && pageIds.every((id) => ticked.has(id))

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <h2 className="sr-only">Product Price Update</h2>
      <InBanner>
        
          <Link to={ROUTES.productPriceList} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <ListChecks size={14} /> View Price Lists
          </Link>
            <button type="button" onClick={() => void exportSheet()} disabled={!products || filtered.length === 0} title="Download the listed products and their prices as an .xlsx" className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              <FileDown size={14} /> Export to Excel
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={!products} title="Fill the new prices from an .xlsx (Ref and Selling Price columns)" className="inline-flex items-center gap-1.5 rounded-md bg-[#198754] px-3 py-2 text-sm font-medium !text-white hover:bg-[#157347] disabled:opacity-60">
              <FileUp size={14} /> Import from Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void importSheet(e.target.files?.[0])} />
      </InBanner>

      <div>
        <p className="mb-1 text-sm font-semibold text-text!">Select Categories:</p>
        <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input-border bg-input-bg px-2 py-1.5">
          {picked.length === 0 && <span className="rounded bg-brand px-2 py-1 text-sm text-white">All Categories</span>}
          {picked.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded bg-brand px-2 py-1 text-sm text-white">
              <button type="button" onClick={() => setPicked((l) => l.filter((x) => x !== id))} aria-label="Remove" className="text-white/90 hover:text-white">
                <X size={12} />
              </button>
              {categories?.items.find((c) => c.id === id)?.label ?? id}
            </span>
          ))}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setPicked((l) => [...l, Number(e.target.value)])
              setPage(1)
            }}
            className="ml-auto bg-transparent text-sm text-text-muted outline-none"
            aria-label="Add a category"
          >
            <option value="">Add a category…</option>
            {unpicked.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled title="Column chooser" className="inline-flex items-center gap-1 rounded-md border border-input-border bg-input-bg px-2.5 py-2 text-text-muted">
          <Columns3 size={15} />
        </button>
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value))
            setPage(1)
          }}
          className="rounded-md border border-input-border bg-input-bg px-2 py-2 text-sm text-text"
          aria-label="Rows per page"
        >
          {[25, 50, 100, 250].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <div className="relative min-w-64 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search"
            className="w-full rounded-md border border-input-border bg-input-bg py-2 pl-8 pr-3 text-sm text-text"
          />
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-sm text-text-muted">
          Price Update Mode:
          <div className="flex overflow-hidden rounded-md border border-brand">
            {(['absolute', 'percentage'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setTyped({})
                }}
                className={`px-4 py-1.5 capitalize ${mode === m ? 'bg-brand text-white' : 'bg-transparent text-brand hover:bg-brand/10'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {note && <p className="rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-text">{note}</p>}
      {isError && <LegacyErrorCard title="Couldn't load the products" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading products…" />}

      {products && (
        <>
          <div className="max-h-[calc(100vh-26rem)] min-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[1000px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: 36 }} />
                <col />
                <col style={{ width: 90 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 100 }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="bg-surface text-left text-xs font-semibold text-text-muted border-b border-border">
                  <th className="px-3 py-2.5 w-8">
                    <input type="checkbox" checked={allTicked} onChange={(e) => setTicked(e.target.checked ? new Set([...ticked, ...pageIds]) : new Set([...ticked].filter((id) => !pageIds.includes(id))))} aria-label="Select all on this page" />
                  </th>
                  <th className="px-3 py-2.5">Label</th>
                  <th className="px-3 py-2.5">Ref</th>
                  <th className="px-3 py-2.5 text-right">Purchase Price</th>
                  <th className="px-3 py-2.5">Cost Price</th>
                  <th className="px-3 py-2.5 w-32">Tax</th>
                  <th className="px-3 py-2.5 w-40">Min. Selling Price (Incl)</th>
                  <th className="px-3 py-2.5 w-44">{mode === 'percentage' ? 'Change (%)' : 'Selling Price (Incl)'}</th>
                  <th className="px-3 py-2.5 w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No product matches.
                    </td>
                  </tr>
                )}
                {pageRows.flatMap((p) => {
                  const group = p.categories[0]?.label ?? 'No tag'
                  const state = rowState[p.id]
                  const preview = mode === 'percentage' ? nextPrice(currentOf(p), typed[p.id] ?? '', mode) : null
                  const rows = []
                  if (group !== lastGroup) {
                    lastGroup = group
                    rows.push(
                      <tr key={`g-${group}`} className="border-b-2 border-brand/40 bg-surface-alt">
                        <td colSpan={9} className="px-3 py-2.5 font-bold text-text!">
                          {group}
                        </td>
                      </tr>,
                    )
                  }
                  rows.push(
                    <tr key={p.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={ticked.has(p.id)}
                          onChange={(e) => setTicked((t) => (e.target.checked ? new Set(t).add(p.id) : new Set([...t].filter((id) => id !== p.id))))}
                          aria-label={`Select ${p.label}`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-text!">{p.label}</td>
                      <td className="px-3 py-1.5 text-text-muted">{p.ref}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-text-muted">{p.cost_price.toFixed(8)}</td>
                      <td className="px-3 py-1.5">
                        <input value={p.pmp.toFixed(8)} readOnly disabled className={cell} aria-label="Cost price" />
                      </td>
                      <td className="px-3 py-1.5">
                        <select value={p.price_base_type === 'TTC' ? 'TTC' : 'HT'} disabled className={cell} aria-label="Price base">
                          <option value="TTC">Inc. tax</option>
                          <option value="HT">Excl. tax</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input value="0.00" readOnly disabled className={cell} aria-label="Minimum selling price" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="any" value={valueOf(p)} onChange={(e) => setTyped((t) => ({ ...t, [p.id]: e.target.value }))} placeholder={mode === 'percentage' ? '0' : formatMoney(currentOf(p))} className={cell} aria-label={`Selling price for ${p.label}`} />
                        {preview !== null && <span className="text-xs text-text-faint">→ {formatMoney(preview)}</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => void saveRow(p).then((ok) => { if (ok) void queryClient.invalidateQueries({ queryKey: ["products"] }) })}
                          disabled={state === 'saving' || !changed(p)}
                          className="inline-flex items-center gap-1.5 rounded bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                        >
                          {state === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Update
                        </button>
                        {state === 'saved' && <span className="block text-xs text-success-fg">Saved</span>}
                        {state && state !== 'saved' && state !== 'saving' && <span className="block text-xs text-danger">{state}</span>}
                      </td>
                    </tr>,
                  )
                  return rows
                })}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={page}
            perPage={perPage}
            total={filtered.length}
            onPageChange={setPage}
            center={
        <button
          type="button"
          onClick={() => void saveTicked()}
          disabled={bulkBusy || ![...ticked].some((id) => filtered.some((p) => p.id === id && changed(p)))}
          className="inline-flex items-center gap-2 rounded-md bg-success px-6 py-1.5 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-50"
        >
          {bulkBusy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Update Prices
        </button>
            }
          />
        </>
      )}
    </div>
  )
}
