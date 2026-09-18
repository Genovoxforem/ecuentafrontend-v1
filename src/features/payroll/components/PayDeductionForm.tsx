import { useMemo, useState } from 'react'
import { Loader2, Plus, Receipt, Trash2, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useUsersSummary } from '../../users/users.queries'
import { usePayDeductionListPage, useCreatePayDeduction, type PayDeductionRowInput } from '../payDeduction.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function currentMonthIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function emptyRow(): PayDeductionRowInput {
  return { expenseTypeId: '', kind: 'Allowance', amount: '' }
}

// pay_deduction.php's list is real, scraped data, and its Add panel's write
// is a real payroll/ajax.php call — see payDeduction.queries.ts's own top
// comment for how both were confirmed live this session (a real test write
// round-tripped through the list correctly).
export function PayDeductionForm() {
  const { data: page, isLoading, isError, error, refetch } = usePayDeductionListPage()
  const { data: users } = useUsersSummary()
  const create = useCreatePayDeduction()

  const [search, setSearch] = useState('')
  const [pagePage, setPagePage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const [showAdd, setShowAdd] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [startMonth, setStartMonth] = useState(currentMonthIso())
  const [endMonth, setEndMonth] = useState(currentMonthIso())
  const [rows, setRows] = useState<PayDeductionRowInput[]>([emptyRow()])
  const [formError, setFormError] = useState('')

  const employeeOptions = useMemo(() => (users?.users ?? []).map((u) => ({ value: String(u.id), label: u.name || u.login })), [users])
  const expenseOptions = page?.expenseCategoryOptions ?? []

  const filteredRows = useMemo(() => {
    const all = page?.rows ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((r) => r.userName.toLowerCase().includes(q) || r.paymentDetails.toLowerCase().includes(q)) : all
  }, [page, search])
  const pageRows = filteredRows.slice((pagePage - 1) * perPage, pagePage * perPage)

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPagePage(1)
  }

  function openAdd() {
    setEmployeeId('')
    setStartMonth(currentMonthIso())
    setEndMonth(currentMonthIso())
    setRows([emptyRow()])
    setFormError('')
    setShowAdd(true)
  }
  function updateRow(index: number, patch: Partial<PayDeductionRowInput>) {
    setRows((cur) => cur.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function addRow() {
    setRows((cur) => [...cur, emptyRow()])
  }
  function removeRow(index: number) {
    setRows((cur) => cur.filter((_, i) => i !== index))
  }

  function handleSave() {
    setFormError('')
    if (!employeeId) return setFormError('Please select an employee.')
    if (!startMonth) return setFormError('Please select a From month.')
    if (!endMonth) return setFormError('Please select an End month.')
    if (rows.some((r) => !r.expenseTypeId || !r.amount.trim())) return setFormError('Fill in Payment Details and Amount for every row.')
    create.mutate(
      { employeeId, startMonth, endMonth, rows },
      { onSuccess: () => setShowAdd(false), onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    // -m-6/-mx-6/-top-6: same sticky-header pattern as ManualShiftAttendanceForm.tsx /
    // StickyFormShell.tsx — sticky's offset is measured from the scrolling ancestor's
    // padding edge, so the negative offsets compensate for AppShell main's own p-6 inset.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Receipt size={20} className="text-brand" /> List User Allowance And Deduction
        </h2>
        <button type="button" onClick={openAdd} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4">
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagePage(1)
              }}
              placeholder="Search"
              className={`w-64 ${inputCls}`}
            />
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="ml-auto text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Payment Details</th>
                  <th className="font-medium px-3 py-2">User Name</th>
                  <th className="font-medium px-3 py-2">Payment Type</th>
                  <th className="font-medium px-3 py-2">Created By</th>
                  <th className="font-medium px-3 py-2">Start Date</th>
                  <th className="font-medium px-3 py-2">End Date</th>
                  <th className="font-medium px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin" /> Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-danger">
                      {error instanceof Error ? error.message : "Couldn't load the list."}{' '}
                      <button type="button" onClick={() => refetch()} className="underline">
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text-muted">{r.paymentDetails || '—'}</td>
                      <td className="px-3 py-2 text-text!">{r.userName}</td>
                      <td className="px-3 py-2 text-text-muted">{r.paymentType}</td>
                      <td className="px-3 py-2 text-text-muted">{r.createdBy}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.startDate}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.endDate}</td>
                      <td className="px-3 py-2 text-text-muted">{r.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={pagePage} perPage={perPage} total={filteredRows.length} onPageChange={setPagePage} edgeToEdge />

      {showAdd && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-xl h-full bg-surface border-l border-border shadow-xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
              <h3 className="text-sm font-semibold text-text!">User Allowance And Deduction Add</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-danger mb-1">User *</label>
                  <SearchableSelect value={employeeId} onChange={setEmployeeId} options={employeeOptions} placeholder="Select employee..." />
                </div>
                <div>
                  <label className="block text-xs text-danger mb-1">Month/Year *</label>
                  <div className="flex items-center gap-2">
                    <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className={`w-full ${inputCls}`} />
                    <span className="text-xs text-text-faint shrink-0">TO</span>
                    <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className={`w-full ${inputCls}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-xs font-medium text-text-faint uppercase tracking-wide">
                  <span>Payment Details</span>
                  <span>Payment Type</span>
                  <span>Amount</span>
                  <span />
                </div>
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                    <select value={row.expenseTypeId} onChange={(e) => updateRow(i, { expenseTypeId: e.target.value })} className={`w-full ${inputCls}`}>
                      <option value="">Select...</option>
                      {expenseOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select value={row.kind} onChange={(e) => updateRow(i, { kind: e.target.value as 'Allowance' | 'Deduction' })} className={`w-full ${inputCls}`}>
                      <option value="Allowance">Allowance</option>
                      <option value="Deduction">Deduction</option>
                    </select>
                    <input value={row.amount} onChange={(e) => updateRow(i, { amount: e.target.value })} inputMode="decimal" placeholder="0.00" className={`w-full ${inputCls}`} />
                    {rows.length > 1 ? (
                      <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-danger hover:bg-danger-bg rounded-md" title="Remove row">
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button type="button" onClick={addRow} className="p-1.5 text-brand hover:bg-brand/10 rounded-md" title="Add row">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {rows.length > 1 && (
                  <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-brand hover:underline">
                    <Plus size={12} /> Add another row
                  </button>
                )}
              </div>

              {formError && <p className="text-sm text-danger">{formError}</p>}

              <button
                type="button"
                disabled={create.isPending}
                onClick={handleSave}
                className="flex items-center justify-center gap-1.5 mx-auto rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:bg-neutral-bg disabled:text-text-faint"
              >
                {create.isPending && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
