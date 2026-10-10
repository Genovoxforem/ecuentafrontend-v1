import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Info, Undo2 } from 'lucide-react'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../shared/components/layout/StickyListLayout'
import { ListPagination } from '../../../shared/components/ListPagination'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useExpensePayments } from '../expensePages.queries'
import type { PaymentRow } from '../expensePagesParser'
import { useDataTable } from '../expenseTable'
import { ExpensePayDialog } from './ExpensePayDialog'
import { PaidBadge, PerPageSelect, SearchBox, SortTh, StatusBadge } from './expenseParts'
import { ROUTES } from '../../../routes'

const amount = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

function sortValue(r: PaymentRow, key: string): string | number {
  switch (key) {
    case 'n':
      return r.n
    case 'ref':
      return r.ref
    case 'employee':
      return r.employee
    case 'period':
      return r.period
    case 'totalTtc':
      return amount(r.totalTtc)
    case 'advance':
      return amount(r.advance)
    case 'net':
      return amount(r.netPayable)
    case 'paidAmount':
      return amount(r.totalPaid)
    default:
      return r.status
  }
}
const searchText = (r: PaymentRow) => [r.ref, r.employee, r.period, r.totalTtc, r.netPayable, r.status, r.paid ? 'Paid' : 'Unpaid'].join(' ')

const NET_CLS = { owed: 'text-brand', surplus: 'text-warning-fg', settled: 'text-success-fg' }

// expense/payments.php: approved reports waiting for (or done with) payment, with the advance already
// given and what is still payable.
export function ExpensePaymentsList() {
  const { data, isLoading, isError, error, refetch } = useExpensePayments()
  const [paying, setPaying] = useState<{ row: PaymentRow; payable: number } | null>(null)
  const t = useDataTable({ rows: data?.rows ?? [], searchText, sortValue, defaultSort: { key: 'ref', dir: 'desc' } })
  const th = (key: string, label: string, align?: 'right') => (
    <SortTh active={t.sort.key === key} dir={t.sort.dir} onSort={() => t.toggleSort(key)} align={align}>
      {label}
    </SortTh>
  )

  return (
    <StickyListLayout
      header={
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Banknote size={20} className="text-brand" /> Expense Payments
          </h2>
          {data?.note && (
            <div className="flex items-center gap-2 rounded-lg border border-info-fg/30 bg-info-bg/40 px-3 py-2 text-sm text-info-fg">
              <Info size={14} className="shrink-0" /> {data.note}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <PerPageSelect value={t.perPage} onChange={t.setPerPage} />
            <SearchBox value={t.search} onChange={t.setSearch} placeholder="Search payments..." />
          </div>
        </>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading payments…" />}
      {isError && <LegacyErrorCard title="Couldn't load payments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <ScrollCard>
            <table className="w-full text-sm">
              <thead className={STICKY_THEAD}>
                <tr className="border-b border-border bg-surface">
                  {th('n', '#')}
                  {th('ref', 'Ref')}
                  {th('employee', 'Employee')}
                  {th('period', 'Period')}
                  {th('totalTtc', 'Total TTC', 'right')}
                  {th('advance', 'Advance', 'right')}
                  {th('net', 'Net Payable', 'right')}
                  {th('paidAmount', 'Total Paid', 'right')}
                  {th('status', 'Status')}
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">Paid</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {t.pageRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center italic text-text-faint">
                      {t.all === 0 ? 'No approved expense reports awaiting payment.' : 'No matching records found'}
                    </td>
                  </tr>
                )}
                {t.pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-text-muted">{r.n}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      <Link to={ROUTES.expenseCard.replace(':id', r.id)} className="text-brand hover:underline">
                        {r.ref}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.employee}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{r.period}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-text!">{r.totalTtc}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text-muted">{r.advance}</td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${NET_CLS[r.netTone]}`}>{r.netPayable}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-text!">{r.totalPaid}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <PaidBadge paid={r.paid} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center">
                      {r.action.kind === 'pay' && (
                        <button
                          type="button"
                          onClick={() => r.action.kind === 'pay' && setPaying({ row: r, payable: r.action.amount })}
                          className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                        >
                          <Banknote size={13} /> {r.action.label}
                        </button>
                      )}
                      {r.action.kind === 'collect' && (
                        <Link
                          to={ROUTES.expensesRepayments}
                          title="Advance exceeds expense — go to Repayments to collect the return"
                          className="inline-flex items-center gap-1.5 rounded-md bg-warning-bg px-3 py-1 text-xs font-medium text-warning-fg hover:brightness-95"
                        >
                          <Undo2 size={13} /> {r.action.label}
                        </Link>
                      )}
                      {r.action.kind === 'settled' && <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-fg">{r.action.label}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollCard>
          <ListPagination page={t.page} perPage={t.perPage} total={t.total} onPageChange={t.setPage} />
        </>
      )}

      {paying && <ExpensePayDialog id={paying.row.id} refLabel={paying.row.ref} payable={paying.payable} onClose={() => setPaying(null)} />}
    </StickyListLayout>
  )
}
