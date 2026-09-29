import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, ReceiptText, Save, Search, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useCreateRebate, useRebateCreateForm } from '../rebate.queries'

const inputCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const areaCls = 'w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PER_PAGE = 25

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={`mb-1 text-xs font-medium ${required ? 'text-danger' : 'text-text-faint'}`}>
        {label}
        {required && '*'}
      </p>
      {children}
    </div>
  )
}

// custom/zra/rebate_create.php — "Create Rebate Invoice (Value Credit Note)".
// The customer list, each customer's invoices (with their ZRA status) and the
// form's own validation messages all come from the backend page. Choosing a
// customer loads that customer's invoices, exactly as the original page does
// by reloading itself with ?socid=…; Create posts the same fields it posts.
export function CreateRebateInvoicePage() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [socid, setSocid] = useState('')
  const [percentage, setPercentage] = useState('')
  const [reason, setReason] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [created, setCreated] = useState<string | null>(null)
  const { data, isLoading, isFetching, isPlaceholderData, isError, error, refetch } = useRebateCreateForm(socid)
  const create = useCreateRebate()

  const invoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = data?.invoices ?? []
    return q ? all.filter((i) => `${i.ref} ${i.date} ${i.amountTtc} ${i.zraStatus}`.toLowerCase().includes(q)) : all
  }, [data?.invoices, search])

  if (isLoading) return <LegacyLoadingCard label="Loading rebate form…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the rebate form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const loadingCustomer = isPlaceholderData
  const pageRows = invoices.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pageIds = pageRows.map((i) => i.id)
  const allTicked = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const chooseCustomer = (value: string) => {
    setSocid(value)
    setSelected(new Set())
    setSearch('')
    setPage(1)
    setCreated(null)
  }

  const save = async () => {
    setCreated(null)
    const ok = await confirm({
      title: 'Create rebate invoice?',
      message: `Create a ${percentage || '0'}% rebate (value credit note) against ${selected.size} invoice${selected.size === 1 ? '' : 's'}?`,
      variant: 'default',
      confirmLabel: 'Create Rebate Invoice',
    })
    if (!ok) return
    create.mutate(
      { token: data.token, socid: data.socid, percentage, reason: reason.trim(), invoiceIds: [...selected] },
      {
        onSuccess: (message) => {
          setCreated(message || 'The backend accepted the rebate request.')
          setSelected(new Set())
          setPercentage('')
          setReason('')
        },
      },
    )
  }

  const pct = Number(percentage)
  const canSave = !!data.socid && !loadingCustomer && percentage !== '' && pct >= 0 && pct <= 100 && reason.trim() !== '' && selected.size > 0 && !create.isPending

  return (
    <StickyFormShell
      scrollsInternally={false}
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ReceiptText size={20} className="text-brand" /> Create Rebate Invoice (Value Credit Note)
        </h2>
      }
      footerLeft={null}
      footerRight={
        <>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Rebate Invoice
          </button>
          <button type="button" onClick={() => navigate(ROUTES.rebateInvoiceList)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <X size={14} /> Cancel
          </button>
        </>
      }
    >
      {created && (
        <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-3.5 py-3 text-sm text-success-fg">
          {created}{' '}
          <Link to={ROUTES.rebateInvoiceList} className="font-medium underline">
            View rebate invoices
          </Link>
        </div>
      )}
      {create.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-3.5 py-3 text-sm text-danger">
          {create.error instanceof Error ? create.error.message : 'Creating the rebate failed.'}
        </div>
      )}

      <Card className="!h-auto">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-3">
          <Field label="Customer" required>
            <SearchableSelect value={socid} onChange={chooseCustomer} options={data.customers} placeholder="Select a third party" />
          </Field>
          <Field label="Rebate Percentage" required>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} step={0.01} value={percentage} onChange={(e) => setPercentage(e.target.value)} className={inputCls} />
              <span className="text-sm text-text-muted">%</span>
            </div>
          </Field>
          <Field label="Rebate Reason" required>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={areaCls} />
          </Field>
        </div>
      </Card>

      {data.socid && (
        <Card className={`!h-auto !p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold text-text!">Select Invoices for Rebate</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">{selected.size} selected</span>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search invoices…"
                  className={inputCls + ' pl-8'}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="w-10 px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allTicked}
                      onChange={() =>
                        setSelected((s) => {
                          const next = new Set(s)
                          for (const id of pageIds) {
                            if (allTicked) next.delete(id)
                            else next.add(id)
                          }
                          return next
                        })
                      }
                      aria-label="Select all invoices on this page"
                    />
                  </th>
                  {['Invoice Ref', 'Date', 'Amount HT', 'VAT', 'Amount TTC', 'ZRA Status'].map((h, i) => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-semibold text-text whitespace-nowrap ${i >= 2 && i <= 4 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center italic text-text-faint">
                      {data.invoices.length === 0 ? 'This customer has no invoices to rebate.' : 'No invoices match the search.'}
                    </td>
                  </tr>
                )}
                {pageRows.map((inv) => (
                  <tr key={inv.id} className="border-b border-border">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggle(inv.id)} aria-label={`Select ${inv.ref}`} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={ROUTES.invoiceDetail.replace(':id', inv.id)} className="text-brand hover:underline">
                        {inv.ref}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{inv.date}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{inv.amountHt}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{inv.vat}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{inv.amountTtc}</td>
                    <td className="px-3 py-2.5">{inv.zraStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination page={page} perPage={PER_PAGE} total={invoices.length} onPageChange={setPage} edgeToEdge />
        </Card>
      )}
    </StickyFormShell>
  )
}
