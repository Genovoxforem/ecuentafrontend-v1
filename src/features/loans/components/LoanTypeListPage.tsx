import { useEffect, useMemo, useState } from 'react'
import { Tags, Search, Plus, X, Check, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { useLoanTypesList, useLoanTypeCreateForm, useCreateLoanType, type LoanTypeRow } from '../loans.queries'
import { formatDate } from '../../../utils/format'

type SortKey = 'name' | 'color' | 'created'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Name', key: 'name' },
  { label: 'Color', key: 'color' },
  { label: 'Created', key: 'created' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(t: LoanTypeRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return t.name
    case 'color':
      return t.color
    case 'created':
      return t.createdAt ? new Date(t.createdAt).getTime() : 0
  }
}

function matchesSearch(t: LoanTypeRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return t.name.toLowerCase().includes(q)
}

// Real via categories/tag-sidebarlist-ajax.php?type_id=23 — the real "Loan
// Type" menu leaf points at categories/loans.php, Dolibarr's generic
// category system (type='loans' => 23, confirmed in
// categories/class/categorie.class.php), the very same one loan_product.php
// itself queries (`SELECT * FROM llx_categorie WHERE type = 23`) for its own
// Loan Type dropdown. Mirrors AgendaCategoriesPage.tsx/TagsList.tsx's exact
// pattern for the same real endpoint family, just for the Loans type.
export function LoanTypeListPage() {
  const { data: types, isLoading, isError, error } = useLoanTypesList()
  const [showAddType, setShowAddType] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => (types ?? []).filter((t) => matchesSearch(t, search)), [types, search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<LoanTypeRow, SortKey>(filteredRows, sortValue)
  const pageRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedRows.map((t) => [t.name, t.color ? `#${t.color}` : '', t.createdAt ? formatDate(t.createdAt) : '—'])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Tags size={20} className="text-brand" /> Loan Type
        </h2>
        <button type="button" onClick={() => setShowAddType(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add Tag
        </button>
      </div>

      {showAddType && <AddLoanTypeModal onClose={() => setShowAddType(false)} />}

      {isError && <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : "Couldn't load loan types."}</Card>}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <select value={perPage} onChange={(e) => handlePerPageChange(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
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
              placeholder="Name"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
            />
          </div>
          <TableExportButtons title="Loan Type" getExportData={getExportData} />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <TheadRow>
                {COLUMNS.map((col) => (
                  <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                    {col.label}
                  </Th>
                ))}
              </TheadRow>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    Loading…
                  </td>
                </tr>
              ) : !types || types.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length}>
                    No loan types match &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                pageRows.map((t) => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="px-4 py-3 text-text!">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-text-muted">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color ? `#${t.color}` : '#397db9' }} />
                        {t.color ? `#${t.color}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{t.createdAt ? formatDate(t.createdAt) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} />
    </div>
  )
}

// categories/card.php?action=create&type=23 — real, working create form now
// (see useLoanTypeCreateForm/useCreateLoanType in loans.queries.ts), not the
// old inert DisabledFormModal — sized wider (max-w-xl vs. that shared
// component's max-w-md) to give Description room to breathe.
function AddLoanTypeModal({ onClose }: { onClose: () => void }) {
  const { data: form, isLoading, isError, error } = useLoanTypeCreateForm()
  const createType = useCreateLoanType()

  const [label, setLabel] = useState('')
  const [color, setColor] = useState('')
  const [parent, setParent] = useState('-1')
  const [description, setDescription] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (isError) setSubmitError(error instanceof Error ? error.message : "Couldn't load this form.")
  }, [isError, error])

  async function handleSubmit() {
    if (!label.trim()) {
      setSubmitError('Label is required.')
      return
    }
    setSubmitError(null)
    try {
      await createType.mutateAsync({ label: label.trim(), description, color: color.replace(/^#/, ''), parent })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create this tag.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-lg bg-surface border border-border shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="flex items-center gap-2 text-base font-semibold text-text!">
            <Tags size={18} className="text-brand" /> Add Tag
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading && <p className="text-sm text-text-faint italic">Loading…</p>}
          {submitError && <p className="text-sm text-danger">{submitError}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Label" required>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClasses} autoFocus />
            </Field>
            <Field label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color ? `#${color.replace(/^#/, '')}` : '#397db9'}
                  onChange={(e) => setColor(e.target.value.replace(/^#/, ''))}
                  className="h-9 w-10 rounded-md border border-input-border bg-input-bg cursor-pointer"
                />
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="397db9" className={inputClasses} />
              </div>
            </Field>
            <Field label="Parent Category">
              <select value={parent} onChange={(e) => setParent(e.target.value)} className={inputClasses}>
                <option value="-1">None</option>
                {(form?.parentOptions ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClasses} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border bg-surface-alt rounded-b-lg">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createType.isPending || isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {createType.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Add Tag
          </button>
        </div>
      </div>
    </div>
  )
}
