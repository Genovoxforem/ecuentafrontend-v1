import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus, ReceiptText, UploadCloud } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useRebatesEnabled, useSyncRebates, type RebateSyncResult } from '../rebate.queries'
import { useRebateList } from '../rebateList.data'

const th = 'px-3 py-2.5 text-left text-xs font-semibold text-text whitespace-nowrap'

// "Rebate Invoices (Value Credit Notes)": one row per rebate with its own ZRA status and message. The rows come from
// custom/zra/fapi/rebate_list.php (see rebateList.data.ts).
//
// Tick rebates and press "Sync selected to ZRA": that sends the ticked ids to the live ZRA gateway and answers per rebate
// (shown below and, after the refresh, in each row's ZRA Status / ZRA Message), exactly like the backend page. Rebates the
// gateway already accepted come back with a disabled box and cannot be ticked.
export function RebateInvoicesList() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [outcome, setOutcome] = useState<RebateSyncResult | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const sync = useSyncRebates()
  const confirm = useConfirm()
  const gate = useRebatesEnabled()
  const list = useRebateList(page, perPage)

  const send = async () => {
    if (selected.size === 0) return
    const ok = await confirm({
      title: 'Sync rebates to ZRA?',
      message: `Send ${selected.size} rebate invoice${selected.size === 1 ? '' : 's'} to the ZRA gateway now?`,
      warningTitle: 'This submits to the live ZRA gateway.',
      warningMessage: 'The gateway records what it accepts; it cannot be undone from here.',
      variant: 'default',
      confirmLabel: 'Sync to ZRA',
    })
    if (!ok) return
    setOutcome(null)
    sync.mutate([...selected], {
      onSuccess: (result) => {
        setOutcome(result)
        setSelected(new Set())
      },
    })
  }

  if (gate.isLoading) return <LegacyLoadingCard label="Loading rebate invoices (value credit notes)…" />
  if (gate.data && !gate.data.enabled) {
    return <LegacyErrorCard title="Couldn't load rebate invoices (value credit notes)" message={gate.data.message} onRetry={() => gate.refetch()} />
  }

  const syncButton = (
    <button
      type="button"
      onClick={send}
      disabled={sync.isPending || selected.size === 0}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
    >
      {sync.isPending ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
      {sync.isPending ? 'Syncing…' : `Sync selected to ZRA${selected.size ? ` (${selected.size})` : ''}`}
    </button>
  )

  const banner = (
    <>
      {outcome && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${outcome.synced === outcome.total ? 'border-success/40 bg-success-bg/50 text-success-fg' : 'border-warning/40 bg-warning-bg/50 text-text'}`}>
          <p className="font-medium">
            Synced {outcome.synced} of {outcome.total} rebate(s)
          </p>
          {outcome.results
            .filter((r) => !r.ok)
            .map((r) => (
              <p key={r.id} className="mt-1">
                Rebate #{r.id}: {r.code ? `${r.code} — ` : ''}
                {r.message || 'Failed'}
              </p>
            ))}
        </div>
      )}
      {sync.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {sync.error instanceof Error ? sync.error.message : 'Sync request failed'}
        </div>
      )}
    </>
  )

  if (list.isLoading) return <LegacyLoadingCard label="Loading rebate invoices (value credit notes)…" />
  if (list.isError) {
    return <LegacyErrorCard title="Couldn't load rebate invoices (value credit notes)" message={list.error instanceof Error ? list.error.message : 'Unknown error.'} onRetry={() => list.refetch()} />
  }

  const rows = list.data?.rows ?? []
  const selectable = rows.filter((r) => !r.synced)
  const allTicked = selectable.length > 0 && selectable.every((r) => selected.has(String(r.id)))
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-4">
      {banner}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ReceiptText size={20} className="text-brand" /> Rebate Invoices (Value Credit Notes)
        </h2>
        <div className="flex items-center gap-2">
          {syncButton}
          <Link to={ROUTES.rebateInvoiceCreate} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            <Plus size={14} /> New Rebate
          </Link>
        </div>
      </div>
      <Card className={`!h-auto !p-0 overflow-hidden transition-opacity ${list.isFetching ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="w-9 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allTicked}
                    disabled={selectable.length === 0}
                    onChange={() => setSelected(allTicked ? new Set() : new Set(selectable.map((r) => String(r.id))))}
                  />
                </th>
                <th className={th}>Ref</th>
                <th className={th}>Date</th>
                <th className={th}>Customer</th>
                <th className={th}>Against Invoice(s)</th>
                <th className={th}>Rebate %</th>
                <th className={`${th} text-right`}>Amount TTC</th>
                <th className={th}>Status</th>
                <th className={th}>ZRA Status</th>
                <th className={th}>ZRA Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center italic text-text-faint">
                    No rebate invoices found
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="px-3 py-2.5">
                    <input type="checkbox" aria-label={`Select ${r.ref}`} checked={selected.has(String(r.id))} disabled={r.synced} onChange={() => toggle(String(r.id))} />
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    <Link to={ROUTES.invoiceDetail.replace(':id', r.invoiceId)} className="text-brand hover:underline">
                      {r.ref}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-text-muted">{r.date}</td>
                  <td className="px-3 py-2.5">
                    {r.customerId ? (
                      <Link to={ROUTES.customerDetail.replace(':id', String(r.customerId))} className="text-brand hover:underline">
                        {r.customerName}
                      </Link>
                    ) : (
                      r.customerName
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {r.sourceInvoices.length === 0
                      ? r.sourceRefs
                      : r.sourceInvoices.map((s, i) => (
                          <span key={`${s.ref}-${i}`}>
                            {i > 0 && ', '}
                            {s.id ? (
                              <Link to={ROUTES.invoiceDetail.replace(':id', String(s.id))} className="text-brand hover:underline">
                                {s.ref}
                              </Link>
                            ) : (
                              s.ref
                            )}
                          </span>
                        ))}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">{r.percent}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.totalTtc}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.status}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.zraStatus}</td>
                  <td className="px-3 py-2.5 text-text-muted">{r.zraMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPagination page={page} perPage={perPage} total={list.data?.total ?? 0} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} perPageOptions={[25, 50, 100]} />
      </Card>
    </div>
  )
}
