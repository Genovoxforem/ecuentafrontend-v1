import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Coins, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../../routes'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../../products/components/LegacyReportStates'
import { useGeneralSettings } from '../../../settings/settings.queries'
import { usDate } from '../../../../api/fapiRow'
import { formatMoney } from '../../../../utils/format'
import { useDeleteVariousPayment, useVariousPayment } from '../../variousPayment.queries'

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-b border-border py-2.5 sm:flex-row sm:gap-4 last:border-0">
    <dt className="w-52 shrink-0 text-xs font-medium text-text-faint">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-text!">{children}</dd>
  </div>
)

// compta/bank/various_payment/card.php?id= — the classic card: label, dates, direction, amount, accounting account,
// subledger account and the bank entry with its reconciled / accounted state. Its buttons are Clone and Delete.
export function MiscPaymentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { data, isLoading, isError, error, refetch } = useVariousPayment(id)
  const { data: settings } = useGeneralSettings()
  const del = useDeleteVariousPayment()

  if (isLoading) return <LegacyLoadingCard label="Loading the payment..." />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the payment" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const accounted = Boolean(data.already_accounted)
  const reconciled = Boolean(data.rappro)
  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this payment?', message: `${data.label} (${formatMoney(data.amount)}) and its bank entry will be deleted.`, variant: 'danger', confirmLabel: 'Delete' })
    if (!ok) return
    try {
      await del.mutateAsync(data.id)
      navigate(ROUTES.ledgerMiscPaymentsList)
    } catch {
      // the message shows under the buttons
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={ROUTES.ledgerMiscPaymentsList} className="flex items-center gap-1 text-sm text-text-faint hover:text-text" title="Back to the list">
            <ChevronLeft size={18} /> Miscellaneous payments
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-text!">
            <Coins size={18} /> Miscellaneous payment {data.ref}
          </h1>
        </div>
        <button type="button" onClick={handleDelete} disabled={del.isPending} className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          <Trash2 size={14} /> Delete
        </button>
      </div>
      {del.isError && <p className="text-sm text-danger">{del.error instanceof Error ? del.error.message : 'Could not delete the payment.'}</p>}

      <Card className="!h-auto">
        <p className="mb-2 text-sm text-text-faint">{accounted ? 'Accounted in the ledger' : 'Not yet accounted in ledger'}</p>
        <dl>
          <Row label="Label">{data.label}</Row>
          <Row label="Date of payment">{usDate(data.date_payment) || '—'}</Row>
          <Row label="Value date">{usDate(data.date_value) || '—'}</Row>
          <Row label="Direction">{data.sens_label ? data.sens_label.charAt(0).toUpperCase() + data.sens_label.slice(1) : '—'}</Row>
          <Row label="Amount">{formatMoney(data.amount)} {settings?.currency ?? ''}</Row>
          <Row label="Accounting account">{data.accountancy_code || '-'}</Row>
          <Row label="Subledger account">{data.subledger_account || '-'}</Row>
          <Row label="Bank entry">
            {data.fk_bank ? (
              <>
                <Link to={ROUTES.bankingEntryDetail.replace(':id', String(data.fk_bank))} className="text-brand hover:underline">{data.fk_bank}</Link>
                {data.bank_account && (
                  <span className="text-text-muted">
                    {' '}(Bank account:{' '}
                    <Link to={ROUTES.bankingAccountDetail.replace(':id', String(data.bank_account.id))} className="text-brand hover:underline">{data.bank_account.ref}</Link>
                    , Entry reconciled with bank receipt: {reconciled ? 'Yes' : 'No'} - Accounted in ledger: {accounted ? 'Yes' : 'No'})
                  </span>
                )}
              </>
            ) : '—'}
          </Row>
        </dl>
      </Card>
    </div>
  )
}
