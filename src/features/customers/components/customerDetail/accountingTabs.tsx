import { useState } from 'react'
import { BookOpen, Check, Plus } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useCreatePaymentMode } from '../../customerDetail.queries'
import { useCustomerPaymentModes, useCustomerAccountsReceivable, useCustomerAccountsPayable, useCustomerGeneralLedger, type AccountingResponse } from '../../customerDetailTabs.queries'
import { TabTitle } from './CustomerDetailShared'

// societe/api/paymentmodes.php — real llx_societe_rib rows (or
// CompanyBankAccount when present), confirmed by reading that file
// directly. Real create action wired via useCreatePaymentMode.
export function PaymentModesTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerPaymentModes(socid)
  const createMode = useCreatePaymentMode(socid)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [bank, setBank] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')

  if (isLoading) return <LegacyLoadingCard label="Loading payment modes…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load payment modes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function resetForm() {
    setLabel('')
    setBank('')
    setIban('')
    setBic('')
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Payment modes</TabTitle>
        {data.can_edit && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> Add account
          </button>
        )}
      </div>
      {showForm && (
        <Card className="!h-auto">
          {createMode.isError && <p className="text-sm text-danger mb-2">{createMode.error instanceof Error ? createMode.error.message : 'Failed to add payment mode.'}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">Label*</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">Bank*</label>
              <input value={bank} onChange={(e) => setBank(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">IBAN</label>
              <input value={iban} onChange={(e) => setIban(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-faint">BIC</label>
              <input value={bic} onChange={(e) => setBic(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text">
              Cancel
            </button>
            <button
              type="button"
              disabled={!label || !bank || createMode.isPending}
              onClick={() => createMode.mutate({ label, bank, iban, bic }, { onSuccess: resetForm })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-60"
            >
              <Check size={14} /> {createMode.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Card>
      )}
      <Card className="!h-auto">
        {data.paymentmodes.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">No bank accounts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.paymentmodes.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-text!">
                  {m.label} {m.default_rib === 1 && <span className="ml-1 text-xs text-brand">(default)</span>}
                </span>
                <span className="text-text-muted">
                  {m.bank} {m.iban && `· ${m.iban}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// societe/api/accounting_ar.php / accounting_ap.php — real open-invoice
// summaries, confirmed by reading both files directly. Shared component
// since both return the identical AccountingResponse shape.
function AccountingSummaryTab({
  title,
  useHook,
}: {
  title: string
  useHook: (socid: string | undefined) => { data?: AccountingResponse; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }
}) {
  return function Inner({ socid }: { socid: string | undefined }) {
    const { data, isLoading, isError, error, refetch } = useHook(socid)
    if (isLoading) return <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />
    if (isError || !data) return <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

    return (
      <div className="space-y-3">
        <TabTitle>{title}</TabTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total invoiced</p>
            <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.summary.total_invoiced)}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Total paid</p>
            <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.summary.total_paid)}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.summary.total_open)}</p>
          </Card>
          <Card className="!h-auto">
            <p className="text-xs text-text-faint uppercase tracking-wide">Open invoices</p>
            <p className="text-lg font-bold text-text! mt-0.5">
              {data.summary.open_count} / {data.summary.invoice_count}
            </p>
          </Card>
        </div>
        <Card className="!h-auto">
          {data.invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BookOpen size={28} className="text-text-faint" />
              <p className="text-sm font-medium text-text-faint">{title}</p>
              <p className="text-sm text-text-faint">No records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium py-2 pr-3">Ref</th>
                    <th className="font-medium py-2 pr-3">Date</th>
                    <th className="font-medium py-2 pr-3">Due</th>
                    <th className="font-medium py-2 pr-3">Total</th>
                    <th className="font-medium py-2 pr-3">Paid</th>
                    <th className="font-medium py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-medium text-text!">{inv.ref}</td>
                      <td className="py-2 pr-3 text-text-muted">{inv.date}</td>
                      <td className="py-2 pr-3 text-text-muted">{inv.due_date}</td>
                      <td className="py-2 pr-3 text-text-muted">{formatMoney(inv.total_ttc)}</td>
                      <td className="py-2 pr-3 text-text-muted">{formatMoney(inv.paid)}</td>
                      <td className="py-2 text-text!">{formatMoney(inv.open)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    )
  }
}

export const AccountsReceivableTab = AccountingSummaryTab({ title: 'Accounts receivable', useHook: useCustomerAccountsReceivable })

export const AccountsPayableTab = AccountingSummaryTab({ title: 'Accounts payable', useHook: useCustomerAccountsPayable })

// societe/api/general_ledger.php — real bank movements (via bank_url) plus
// real bookkeeping lines matched on this record's own accounting code,
// confirmed by reading that file directly.
export function GeneralLedgerTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerGeneralLedger(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading general ledger…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load general ledger" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>General ledger</TabTitle>
      <Card className="!h-auto">
        {data.movements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <BookOpen size={28} className="text-text-faint" />
            <p className="text-sm font-medium text-text-faint">General ledger</p>
            <p className="text-sm text-text-faint">No records yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Date</th>
                  <th className="font-medium py-2 pr-3">Label</th>
                  <th className="font-medium py-2 pr-3">Account</th>
                  <th className="font-medium py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={`${m.source}-${m.id}`} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-text-muted">{m.date}</td>
                    <td className="py-2 pr-3 text-text!">{m.label}</td>
                    <td className="py-2 pr-3 text-text-muted">{m.account}</td>
                    <td className={`py-2 ${m.amount < 0 ? 'text-danger' : 'text-text!'}`}>{formatMoney(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
