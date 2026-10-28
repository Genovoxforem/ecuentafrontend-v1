import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardList, FileSignature, Layers, LoaderCircle, XCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useCreateDdOrder, useDdCandidates, useDdOrderLines, useDdRejects, useDdRequests, useDdSummary } from '../directDebit.queries'
import type { DdOrderLineRow, DdRejectRow, DdRequestRow, DdStatRow } from '../directDebitFapi'
import { BankingTablePage, type BankingColumn } from './BankingTablePage'

const invoiceLink = (id: number, ref: string): ReactNode =>
  id ? (
    <Link to={ROUTES.invoiceDetail.replace(':id', String(id))} className="text-brand hover:underline">
      {ref}
    </Link>
  ) : (
    ref
  )
const companyLink = (id: number, name: string): ReactNode =>
  id ? (
    <Link to={ROUTES.customerDetail.replace(':id', String(id))} className="text-brand hover:underline">
      {name}
    </Link>
  ) : (
    name
  )

// ---- Direct debit order lines (classic compta/prelevement/list.php) ---------------------------------------------------------------------------

const ORDER_LINE_COLUMNS: BankingColumn<DdOrderLineRow>[] = [
  { label: 'Line', text: (r) => r.line },
  { label: 'Invoice', text: (r) => r.invoice, render: (r) => invoiceLink(r.invoiceId, r.invoice) },
  { label: 'Company', text: (r) => r.company, render: (r) => companyLink(r.companyId, r.company) },
  { label: 'Customer Code', text: (r) => r.customerCode },
  { label: 'Date', text: (r) => r.date },
  { label: 'Amount', text: (r) => r.amount, align: 'right' },
]

export function DirectDebitOrdersPage() {
  const q = useDdOrderLines()
  return (
    <BankingTablePage
      title="Direct debit order lines"
      icon={ClipboardList}
      columns={ORDER_LINE_COLUMNS}
      rows={q.data}
      isLoading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.id}
      emptyText="None"
    />
  )
}

// ---- Requests to process (classic demandes.php) ------------------------------------------------------------------------------------------------

const REQUEST_COLUMNS: BankingColumn<DdRequestRow>[] = [
  { label: 'Invoice', text: (r) => r.invoice, render: (r) => invoiceLink(r.invoiceId, r.invoice) },
  { label: 'Company', text: (r) => r.company, render: (r) => companyLink(r.companyId, r.company) },
  { label: 'Amount requested', text: (r) => r.amountRequested, align: 'right' },
  { label: 'Request date', text: (r) => r.date },
]

export function DirectDebitRequestsPage() {
  const q = useDdRequests()
  return (
    <BankingTablePage
      title="Requests for direct debit payment order to process"
      icon={Layers}
      columns={REQUEST_COLUMNS}
      rows={q.data}
      isLoading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.id}
      emptyText="None"
    />
  )
}

// ---- Rejects (classic rejets.php) ---------------------------------------------------------------------------------------------------------------------

const REJECT_COLUMNS: BankingColumn<DdRejectRow>[] = [
  { label: 'Line', text: (r) => r.line },
  { label: 'Third-party', text: (r) => r.company },
  { label: 'Reason', text: (r) => r.reason },
]

export function DirectDebitRejectsPage() {
  const q = useDdRejects()
  return (
    <BankingTablePage
      title="Direct debit refused"
      note={q.data ? String(q.data.length) : undefined}
      icon={XCircle}
      columns={REJECT_COLUMNS}
      rows={q.data}
      isLoading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.key}
      emptyText="None"
    />
  )
}

// ---- Shared pieces for the card pages ----------------------------------------------------------------------------------------------------------------

function PageShell({ title, icon: Icon, children }: { title: string; icon: typeof FileSignature; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: ReactNode }) {
  return <div className="px-4 py-2.5 bg-brand text-white text-sm font-bold">{children}</div>
}

function FigureRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-text!">{value}</span>
    </div>
  )
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-4 text-text-faint italic">
        {text}
      </td>
    </tr>
  )
}

// ---- Area (classic index.php) ------------------------------------------------------------------------------------------------------------------------

export function DirectDebitAreaPage() {
  const q = useDdSummary()
  if (q.isLoading) return <LegacyLoadingCard label="Loading direct debit area…" />
  if (q.isError || !q.data) return <LegacyErrorCard title="Couldn't load the direct debit area" message={q.error instanceof Error ? q.error.message : 'Unknown error.'} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <PageShell title="Payments by Direct debit orders" icon={FileSignature}>
      <Card className="!p-0 overflow-hidden">
        <CardTitle>Statistics</CardTitle>
        <FigureRow label="No. of qualified customer invoices with waiting direct debit order" value={d.toWithdrawCount} />
        <FigureRow label="Amount to withdraw" value={`${d.toWithdrawAmount} ${d.currency}`} />
      </Card>

      <Card className="!p-0 overflow-hidden">
        <CardTitle>Invoice waiting for direct debit ({d.waitingCount})</CardTitle>
        {d.waiting.length === 0 ? (
          <p className="px-4 py-4 text-sm text-text-faint italic">No invoice open for 'Direct debit orders' is waiting.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <TheadRow>
                <Th>Invoice</Th>
                <Th>Company</Th>
                <Th align="right">Amount</Th>
                <Th>Request date</Th>
              </TheadRow>
            </thead>
            <tbody>
              {d.waiting.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text-muted">{invoiceLink(r.invoiceId ?? 0, r.invoice)}</td>
                  <td className="px-4 py-2 text-text-muted">{r.company}</td>
                  <td className="px-4 py-2 text-right text-text-muted">{r.amount}</td>
                  <td className="px-4 py-2 text-text-muted">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="!p-0 overflow-hidden">
        <CardTitle>Latest 5 direct debit receipts</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              <Th>Date</Th>
              <Th align="right">Amount</Th>
              <Th>Status</Th>
            </TheadRow>
          </thead>
          <tbody>
            {d.latest.length === 0 ? (
              <EmptyRow cols={3} text="None" />
            ) : (
              d.latest.slice(0, 5).map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text-muted">{r.date}</td>
                  <td className="px-4 py-2 text-right text-text-muted">{r.amount}</td>
                  <td className="px-4 py-2 text-text-muted">{r.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </PageShell>
  )
}

// ---- Statistics (classic stats.php) -----------------------------------------------------------------------------------------------------------------

function StatTable({ title, rows, total }: { title: string; rows: DdStatRow[]; total: { count: number; amount: string } }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <CardTitle>{title}</CardTitle>
      <table className="w-full text-sm">
        <thead>
          <TheadRow>
            <Th>Status</Th>
            <Th align="right">Number</Th>
            <Th align="right">%</Th>
            <Th align="right">Amount</Th>
            <Th align="right">%</Th>
          </TheadRow>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border">
              <td className="px-4 py-2 text-text-muted">{r.label}</td>
              <td className="px-4 py-2 text-right text-text-muted">{r.count}</td>
              <td className="px-4 py-2 text-right text-text-muted">{r.countPct}</td>
              <td className="px-4 py-2 text-right text-text-muted">{r.amount}</td>
              <td className="px-4 py-2 text-right text-text-muted">{r.amountPct}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="px-4 py-2 text-text!">Total</td>
            <td className="px-4 py-2 text-right text-text!">{total.count}</td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-right text-text!">{total.amount}</td>
            <td className="px-4 py-2" />
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

export function DirectDebitStatsPage() {
  const q = useDdSummary()
  if (q.isLoading) return <LegacyLoadingCard label="Loading direct debit statistics…" />
  if (q.isError || !q.data) return <LegacyErrorCard title="Couldn't load the direct debit statistics" message={q.error instanceof Error ? q.error.message : 'Unknown error.'} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <PageShell title="Direct debit payment statistics" icon={ClipboardList}>
      <StatTable title="By status" rows={d.byStatus} total={d.total} />
      <StatTable title="Rejects" rows={d.rejects} total={d.rejectsTotal} />
    </PageShell>
  )
}

// ---- New order (classic create.php) -----------------------------------------------------------------------------------------------------------------

export function DirectDebitNewPage() {
  const q = useDdCandidates()
  const create = useCreateDdOrder()
  const confirm = useConfirm()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // The endpoint is asked what it would create first (nothing is written); the order is only made once that is confirmed.
  async function handleCreate() {
    setMessage('')
    setError('')
    try {
      const plan = await create.mutateAsync(false)
      const ok = await confirm({
        title: 'Create direct debit file?',
        message: `${plan.count} invoice${plan.count === 1 ? '' : 's'}, total ${plan.total} ${q.data?.currency ?? ''}.`,
        variant: 'default',
        warningTitle: '',
        confirmLabel: 'Create',
      })
      if (!ok) return
      const done = await create.mutateAsync(true)
      setMessage(`Direct debit order${done.ref ? ` ${done.ref}` : ''} created (${done.count} invoice${done.count === 1 ? '' : 's'}).`)
      q.refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The direct debit order could not be created.')
    }
  }

  if (q.isLoading) return <LegacyLoadingCard label="Loading invoices waiting for a direct debit order…" />
  if (q.isError || !q.data) return <LegacyErrorCard title="Couldn't load the new direct debit order" message={q.error instanceof Error ? q.error.message : 'Unknown error.'} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <PageShell title="New direct debit order" icon={FileSignature}>
      <Card className="!p-0 overflow-hidden">
        <FigureRow label="No. of qualified customer invoices with waiting direct debit order" value={d.count} />
        <FigureRow label="Total amount" value={`${d.total} ${d.currency}`} />
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
          <button
            type="button"
            disabled={d.count === 0 || create.isPending}
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {create.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Create direct debit file (all)
          </button>
          {message && <span className="text-sm text-success-fg">{message}</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <CardTitle>Invoice waiting for direct debit</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              <Th>Invoice</Th>
              <Th>Third-party</Th>
              <Th>Bank Account Number</Th>
              <Th>UMR</Th>
              <Th align="right">Amount (inc. tax)</Th>
              <Th>Request date</Th>
            </TheadRow>
          </thead>
          <tbody>
            {d.rows.length === 0 ? (
              <EmptyRow cols={6} text="None" />
            ) : (
              d.rows.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text-muted">{r.invoice}</td>
                  <td className="px-4 py-2 text-text-muted">{r.company}</td>
                  <td className="px-4 py-2 text-text-muted">{r.bankNumber}</td>
                  <td className="px-4 py-2 text-text-muted">{r.umr}</td>
                  <td className="px-4 py-2 text-right text-text-muted">{r.amount}</td>
                  <td className="px-4 py-2 text-text-muted">{r.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </PageShell>
  )
}
