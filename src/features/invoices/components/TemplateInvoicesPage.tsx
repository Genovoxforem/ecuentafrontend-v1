import { useMemo, useState } from 'react'
import { Flag, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { isBackendUnavailable, BackendUnavailableInline } from '../../../shared/components/BackendUnavailable'
import { formatMoney } from '../../../utils/format'
import { useInvoiceTemplates, type InvoiceTemplateRow } from '../invoiceTemplates.queries'

function fmtDate(v: string | null) {
  if (!v) return 'NA'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return 'NA'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type SortKey = 'ref' | 'thirdParty' | 'amountExclTax' | 'vat' | 'amountInclTax' | 'recurring' | 'frequency' | 'frequencyUnit' | 'nbGen' | 'dateLastGen' | 'dateNextGen' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Amount (Excl. Tax)', key: 'amountExclTax' },
  { label: 'VAT', key: 'vat' },
  { label: 'Amount (Inc. Tax)', key: 'amountInclTax' },
  { label: 'Template/Recurring Invoice', key: 'recurring' },
  { label: 'Frequency', key: 'frequency' },
  { label: 'Frequency Unit', key: 'frequencyUnit' },
  { label: 'Number Of Generation Done', key: 'nbGen' },
  { label: 'Date Latest Gen.', key: 'dateLastGen' },
  { label: 'Date Next Gen.', key: 'dateNextGen' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(r: InvoiceTemplateRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.thirdParty ?? '', r.statusLabel].some((field) => field.toLowerCase().includes(q))
}

function sortValue(r: InvoiceTemplateRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'thirdParty':
      return r.thirdParty ?? ''
    case 'amountExclTax':
      return r.amountExclTax
    case 'vat':
      return r.vat
    case 'amountInclTax':
      return r.amountInclTax
    case 'recurring':
      return r.isRecurring ? 'Yes' : 'No'
    case 'frequency':
      return r.frequency
    case 'frequencyUnit':
      return r.frequencyUnit
    case 'nbGen':
      return r.nbGenDone
    case 'dateLastGen':
      return r.dateLastGen ?? ''
    case 'dateNextGen':
      return r.dateNextGen ?? ''
    case 'status':
      return r.statusLabel
  }
}

// Real GET /api/invoice-templates/ data (see invoiceTemplates.queries.ts),
// reading llx_facture_rec directly. Read-only, matching the legacy page's
// own instructions for how templates get created.
export function TemplateInvoicesPage() {
  const { data, isLoading, isError, error } = useInvoiceTemplates()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const items = useMemo(() => data?.items ?? [], [data])
  const filteredItems = useMemo(() => items.filter((r) => matchesSearch(r, search)), [items, search])
  const { sorted: sortedItems, sort, toggleSort } = useSortableRows<InvoiceTemplateRow, SortKey>(filteredItems, sortValue)
  const pageItems = sortedItems.slice((page - 1) * perPage, page * perPage)

  const totals = sortedItems.reduce(
    (acc, r) => ({ ht: acc.ht + r.amountExclTax, vat: acc.vat + r.vat, ttc: acc.ttc + r.amountInclTax }),
    { ht: 0, vat: 0, ttc: 0 },
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedItems.map((r) => [
      r.ref,
      r.thirdParty || '-',
      formatMoney(r.amountExclTax),
      formatMoney(r.vat),
      formatMoney(r.amountInclTax),
      r.isRecurring ? 'Yes' : 'No',
      r.isRecurring ? String(r.frequency) : '',
      r.isRecurring ? r.frequencyUnit.toUpperCase() : '',
      r.isRecurring ? `${r.nbGenDone} / ${r.nbGenMax}` : 'NA',
      fmtDate(r.dateLastGen),
      fmtDate(r.dateNextGen),
      r.statusLabel,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Flag size={20} className="text-brand" /> Template Invoices
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <p className="text-sm text-text-muted">
          To create a template invoice, create a standard invoice, then, without validating it, click onto button "Convert into template invoice".
        </p>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Template Invoices" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.key.toLowerCase().includes('amount') || col.key === 'vat' ? 'right' : 'left'}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4">
                      {isBackendUnavailable(error) ? (
                        <BackendUnavailableInline feature="Invoice Templates" />
                      ) : (
                        <span className="text-danger">Could not load template invoices.</span>
                      )}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No template invoices match "{search}".
                    </td>
                  </tr>
                ) : (
                  <>
                    {pageItems.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                        <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                        <td className="px-4 py-3 text-text!">{r.thirdParty || '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-muted">{formatMoney(r.amountExclTax)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-muted">{formatMoney(r.vat)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amountInclTax)}</td>
                        <td className="px-4 py-3 text-text-muted">{r.isRecurring ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-text-muted">{r.isRecurring ? r.frequency : ''}</td>
                        <td className="px-4 py-3 text-text-muted">{r.isRecurring ? r.frequencyUnit.toUpperCase() : ''}</td>
                        <td className="px-4 py-3 text-text-muted">{r.isRecurring ? `${r.nbGenDone} / ${r.nbGenMax}` : 'NA'}</td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.dateLastGen)}</td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.dateNextGen)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.statusLabel === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{r.statusLabel}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold text-text!">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.ht)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.vat)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.ttc)}</td>
                      <td className="px-4 py-3" colSpan={6} />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredItems.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
