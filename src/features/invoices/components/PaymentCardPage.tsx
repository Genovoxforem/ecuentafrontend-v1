import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { useDeletePayment, usePayment } from '../payments.queries'

// yyyy-MM-dd -> MM/dd/yyyy (the classic page's own date format)
const fmtDate = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : v
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 border-b border-border px-4 py-3 text-sm last:border-0">
      <dt className="text-text-faint">{label}</dt>
      <dd className="min-w-0 text-text!">{children}</dd>
    </div>
  )
}

// The classic payment card (compta/paiement/card.php): the header with the ref and number, then the payment's
// date, type, amount, bank account and the invoices it settles. compta/paiement/fapi has a list only, so the
// card is built from the list row (the bank entry id is in it since 13 Nov 2026; the Log tab has no field yet, AN-142). Delete is
// compta/paiement/fapi/delete.php, which refuses a closed period or a reconciled bank line with its own message.
export function PaymentCardPage() {
  const { ref = '' } = useParams<{ ref: string }>()
  const { data: payment, isLoading, isError, error, refetch } = usePayment(ref)
  const remove = useDeletePayment()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(id: number, label: string) {
    setDeleteError('')
    if (!(await confirm({ title: 'Delete payment', message: `Are you sure you want to delete the payment ${label}?` }))) return
    try {
      await remove.mutateAsync(id)
      navigate(ROUTES.paymentsList)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'The payment was not deleted.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-text-faint">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    )
  }
  if (isError) return <LegacyErrorCard title="Couldn't load the payment" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!payment) return <LegacyErrorCard title="Payment not found" message={`No payment with the ref ${ref}.`} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-text-faint">Ref.: </span>
            <span className="font-semibold text-brand">{payment.ref}</span>
          </div>
          <button type="button" onClick={() => handleDelete(payment.id, payment.ref)} disabled={remove.isPending} className="flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-bg disabled:opacity-60">
            <Trash2 size={14} /> Delete
          </button>
          {(payment.numPayment || payment.paymentReference) && (
            <div>
              <span className="text-text-faint">Number: </span>
              <span className="font-semibold text-text!">{payment.numPayment || payment.paymentReference}</span>
            </div>
          )}
        </div>
      </Card>

      {deleteError && <p className="text-sm text-danger">{deleteError}</p>}

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-text!">Payment</div>
        <dl>
          <Field label="Date">{fmtDate(payment.paymentDate)}</Field>
          <Field label="Third-Party">
            {payment.socid ? (
              <Link to={ROUTES.customerDetail.replace(':id', String(payment.socid))} className="text-brand hover:underline">
                {payment.customerName || '-'}
              </Link>
            ) : (
              payment.customerName || '-'
            )}
          </Field>
          <Field label="Payment Type">{payment.paymentTypeLabel || '-'}</Field>
          <Field label="Amount">
            <span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
          </Field>
          <Field label="Bank Account">
            {payment.accountId ? (
              <Link to={ROUTES.bankingAccountDetail.replace(':id', String(payment.accountId))} className="text-brand hover:underline">
                {payment.accountName}
              </Link>
            ) : (
              payment.accountName || '-'
            )}
          </Field>
          <Field label="Bank Entry">
            {payment.bankEntryId ? (
              <Link to={ROUTES.bankingEntryDetail.replace(':id', String(payment.bankEntryId))} className="text-brand hover:underline">
                {payment.bankEntryId}
              </Link>
            ) : (
              <span className="text-text-faint">-</span>
            )}
          </Field>
        </dl>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-text!">Invoices paid</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-faint">
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Already paid</th>
              </tr>
            </thead>
            <tbody>
              {payment.invoices.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-3 italic text-text-faint">
                    No invoice linked.
                  </td>
                </tr>
              ) : (
                payment.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link to={ROUTES.invoiceDetail.replace(':id', String(invoice.id))} className="text-brand hover:underline">
                        {invoice.ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(invoice.total_ttc)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(invoice.amount_paid)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
