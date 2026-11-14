import { useEffect, useState, type ComponentType } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Mail, Printer } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Banner, FormDialog, NoticeStrip, PageHeading } from '../../fixedAsset/components/AssetUi'
import { GHOST_BTN, useNotice } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, money } from '../../fixedAsset/assetModels'
import { receiptEmailDraft, receiptEmailSend, receiptPrinted, useReceipt } from '../installments.data'
import { downloadInstallmentFile, openInstallmentPdf } from '../installmentService'
import { apiFailure, planPath } from '../installmentHelpers'
import { QueryStates, StatusBadge } from './InstallmentUi'

// One payment receipt (classic installment/receipt.php): the printable receipt, Print / PDF / Download and the e-mail dialog, from
// installment/api/receipts.php (action=get, printed, pdf, email).
export function InstallmentReceiptPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const id = Number(useParams().id)
  const isNew = useSearchParams()[0].get('new')
  const q = useReceipt(id)
  const { notice, show } = useNotice()
  const [mail, setMail] = useState<{ subject: string; message: string } | null>(null)
  const r = q.data

  useEffect(() => {
    if (isNew && r) show(`Payment recorded — receipt ${r.ref} issued.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, r?.ref])

  async function run(job: () => Promise<unknown>) {
    try {
      await job()
    } catch (e) {
      show(apiFailure(e), 'bad')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="Payment receipt">
        {r ? `${r.ref} · ${r.customer}` : ''}
      </PageHeading>
      <NoticeStrip notice={notice} />
      <QueryStates loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} what="the receipt" />

      {r && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <Link to={`${planPath(r.plan_id)}?tab=payments`} className={GHOST_BTN}>
              <ArrowLeft size={14} /> {r.plan_ref}
            </Link>
            {r.rights.receipt_write && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={GHOST_BTN}
                  onClick={() => {
                    receiptPrinted(r.id).catch(() => undefined)
                    window.print()
                  }}
                >
                  <Printer size={14} /> Print
                </button>
                <button type="button" className={GHOST_BTN} onClick={() => run(() => openInstallmentPdf('receipts.php', { action: 'pdf', id: r.id }))}>
                  <FileText size={14} /> PDF
                </button>
                <button type="button" className={GHOST_BTN} onClick={() => run(() => downloadInstallmentFile('receipts.php', { action: 'pdf', id: r.id, download: 1 }, `${r.ref}.pdf`))}>
                  <Download size={14} /> Download
                </button>
                <button
                  type="button"
                  className={GHOST_BTN}
                  onClick={() =>
                    run(async () => {
                      const draft = await receiptEmailDraft(r.id, r.customer_email || 'customer@example.com')
                      setMail(draft.data)
                    })
                  }
                >
                  <Mail size={14} /> E-mail
                </button>
              </div>
            )}
          </div>
          {r.status === 'cancelled' && (
            <Banner tone="bad">
              This receipt is <b>cancelled</b>: its payment was reversed. It is kept for the audit trail.
            </Banner>
          )}

          <Card className="mx-auto !h-auto w-full max-w-3xl !p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                {r.company.logo && <img src={r.company.logo} alt="" className="max-h-14" />}
                <div className="mt-1.5 text-base font-bold text-text!">{r.company.name}</div>
                <div className="whitespace-pre-line text-sm text-text-muted">
                  {r.company.address}
                  {r.company.tpin ? `\nTPIN ${r.company.tpin}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold tracking-tight text-text!">PAYMENT RECEIPT</div>
                <div className="font-mono text-base text-text">{r.ref}</div>
                <div className="text-sm text-text-muted">{fmtDate(r.date)}</div>
                {r.status === 'cancelled' && <StatusBadge status="cancelled" />}
              </div>
            </div>

            <table className="mt-4 w-full text-sm">
              <tbody>
                {(
                  [
                    ['Received from', `${r.customer}${r.customer_tpin ? ` · TPIN ${r.customer_tpin}` : ''}`],
                    ['Invoice', r.invoice_ref],
                    ['Installment plan', r.plan_ref],
                    ['Payment', `${r.payment_ref}${r.reference ? ` · ${r.reference}` : ''}`],
                    ['Payment method', r.mode || '—'],
                    ['Received in', r.account || '—'],
                  ] as Array<[string, string]>
                ).map(([k, val]) => (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="w-44 py-2 text-text-muted">{k}</td>
                    <td className="py-2 text-text">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="py-2">Installment</th>
                  <th>Due</th>
                  <th className="text-right">Installment amount</th>
                  <th className="text-right">Paid now</th>
                </tr>
              </thead>
              <tbody>
                {r.allocations.map((a, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 text-text">
                      {a.ref} {a.label}
                    </td>
                    <td className="text-text">{fmtDate(a.due_date)}</td>
                    <td className="text-right tabular-nums text-text">{money(a.installment_amount)}</td>
                    <td className="text-right tabular-nums text-text">{money(a.allocated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <table className="min-w-80 text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-text">Amount received</td>
                    <td className="py-1 text-right text-lg font-bold tabular-nums text-text!">
                      {money(r.amount)} {r.currency}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-text-muted">Previously paid</td>
                    <td className="py-1 text-right tabular-nums">{money(r.plan_paid_before)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-text-muted">Outstanding after</td>
                    <td className="py-1 text-right tabular-nums">{money(r.plan_outstanding_after)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {r.note && (
              <p className="mt-2 text-sm">
                <span className="text-text-muted">Note:</span> {r.note}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-between gap-3 text-sm text-text">
              <div>
                Received by: <b>{r.received_by}</b>
              </div>
              <div>Signature: ______________________</div>
            </div>
            <p className="mt-3 text-center text-[11px] text-text-muted">
              Printed {r.print_count} time(s) · {r.ref}
            </p>
          </Card>
        </>
      )}

      {r && mail && (
        <FormDialog
          title={`E-mail receipt ${r.ref}`}
          items={[
            { key: 'to', label: 'To', required: true },
            { key: 'subject', label: 'Subject', full: true },
            { key: 'message', label: 'Message', type: 'textarea', full: true },
          ]}
          initial={{ to: r.customer_email || '', subject: mail.subject, message: mail.message }}
          okLabel="Send e-mail"
          intro="The PDF receipt is attached. Check the address before sending."
          onSave={async (v) => {
            const res = await receiptEmailSend(r.id, v)
            show(res.message ?? 'E-mail sent.')
          }}
          onClose={() => setMail(null)}
        />
      )}
    </div>
  )
}
