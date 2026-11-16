import { useState, type ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Banner, EmptyState, NoticeStrip, PageHeading } from '../../fixedAsset/components/AssetUi'
import { GHOST_BTN, TD, TDR, TH, THR, useNotice } from '../../fixedAsset/assetUiHelpers'
import { fmtDate, money } from '../../fixedAsset/assetModels'
import { useInstallmentCustomers, useInstallmentReport } from '../installments.data'
import { downloadInstallmentFile } from '../installmentService'
import { apiFailure } from '../installmentHelpers'
import { REPORTS } from '../installmentModels'
import { FILTER_INPUT, InstallmentSubNav, QueryStates } from './InstallmentUi'

const STATUS_OPTIONS = ['draft', 'active', 'completed', 'cancelled']

// Installment reports (classic installment/reports.php): ten reports on installment/api/reports.php?action=<report> with the same filters,
// the CSV the server builds and the browser's print for "PDF / print". The report tab is kept in ?report= (the classic page used #hash).
export function InstallmentReportsPage({ icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [sp, setSp] = useSearchParams()
  const requested = sp.get('report') ?? 'summary'
  const report = REPORTS.some(([k]) => k === requested) ? requested : 'summary'
  const [f, setF] = useState({ from: '', to: '', customer: '', currency: '', status: '' })
  const set = (k: keyof typeof f, v: string) => setF((cur) => ({ ...cur, [k]: v }))
  const { notice, show } = useNotice()
  const customers = useInstallmentCustomers('')
  const needsCustomer = report === 'statement' && !f.customer
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
  const q = useInstallmentReport(report, params, !needsCustomer)
  const d = needsCustomer ? undefined : q.data
  const ledgerNote = report === 'ledger' && d?.totals.not_transferred_payments

  async function exportCsv() {
    try {
      await downloadInstallmentFile('reports.php', { action: report, format: 'csv', ...params }, `installment-${report}.csv`)
    } catch (e) {
      show(apiFailure(e, 'Could not export the report.'), 'bad')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading icon={icon} title="Installment reports">
        Summary, collections, outstanding, overdue, statements, aging and ledger.
      </PageHeading>
      <InstallmentSubNav active="reports" />
      <nav aria-label="Reports" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-alt p-1.5 print:hidden">
        {REPORTS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={report === key ? 'page' : undefined}
            onClick={() => setSp({ report: key })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${report === key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <NoticeStrip notice={notice} />

      <Card className="!h-auto print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" aria-label="From" title="From" value={f.from} onChange={(e) => set('from', e.target.value)} className={FILTER_INPUT} />
          <input type="date" aria-label="To" title="To" value={f.to} onChange={(e) => set('to', e.target.value)} className={FILTER_INPUT} />
          <select aria-label="Customer" value={f.customer} onChange={(e) => set('customer', e.target.value)} className={FILTER_INPUT}>
            <option value="">{report === 'statement' ? '— choose a customer —' : 'All customers'}</option>
            {(customers.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input aria-label="Currency" placeholder="Currency" value={f.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={`${FILTER_INPUT} !w-28`} />
          <select aria-label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} className={FILTER_INPUT}>
            <option value="">All (excl. cancelled)</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-sm text-text-muted">{d ? `${d.rows.length.toLocaleString('en-US')} row(s)` : ''}</span>
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} className={GHOST_BTN}>
              <Download size={14} /> Excel (CSV)
            </button>
            <button type="button" onClick={() => window.print()} className={GHOST_BTN}>
              <Printer size={14} /> PDF / print
            </button>
          </div>
        </div>
      </Card>

      {needsCustomer && (
        <Card className="!h-auto">
          <EmptyState title="Choose a customer">The statement lists the installments and payments of one customer.</EmptyState>
        </Card>
      )}
      {!needsCustomer && <QueryStates loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} what="the report" />}

      {d && (
        <Card className="!h-auto !p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <b className="text-text!">{d.title}</b>
            <span className="text-sm text-text-muted">{`${f.from || '…'} → ${f.to || '…'}`}</span>
          </div>
          {d.rows.length === 0 ? (
            <EmptyState title="Nothing to report">Change the filters.</EmptyState>
          ) : (
            <div className={`overflow-x-auto ${q.isPlaceholderData ? 'opacity-60' : ''}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {d.columns.map((c) => (
                      <th key={c.key} className={c.money ? THR : TH}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {d.columns.map((c) => {
                        const v = r[c.key]
                        return (
                          <td key={c.key} className={c.money ? TDR : TD}>
                            {c.money ? money(v as number) : /date|due/.test(c.key) ? fmtDate(v as string) : v == null ? '' : String(v)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface font-bold">
                    {d.columns.map((c, i) => (
                      <td key={c.key} className={c.money ? TDR : TD}>
                        {i === 0 ? 'Total' : c.money && d.totals[c.key] != null ? money(d.totals[c.key]) : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {ledgerNote ? (
            <div className="p-3">
              <Banner tone="warn">
                {d.totals.not_transferred_payments} payment(s) for {money(d.totals.not_transferred_amount)} are not transferred to the ledger yet — run the Bank journal.
              </Banner>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}
