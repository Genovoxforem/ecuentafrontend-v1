import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Coins, RotateCcw, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useExchangeList, type ExchangeFilters, type ExchangeRequest } from '../exchangeList.queries'
import type { ExchangeRow } from '../exchangeListParser'

const inputCls = 'h-9 w-full rounded-md border border-input-border bg-input-bg px-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'px-3 py-2.5 text-xs font-semibold text-text whitespace-nowrap'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// The page opens on the current month, as the backend's own period picker does.
function currentMonth(): ExchangeFilters {
  const now = new Date()
  return {
    currency: '',
    dateStart: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateEnd: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    account: '',
  }
}

const GAIN_COLOR = {
  up: 'text-success',
  down: 'text-danger',
  none: 'text-warning',
} as const

// One amount over the amount in the other currency, as the page prints it.
function Amount({ main, note, prefix }: { main: string; note: string; prefix: string }) {
  if (!main) return null
  return (
    <>
      {main}
      {note && (
        <span className="block text-xs italic text-text-faint">
          {prefix}
          {note}
        </span>
      )}
    </>
  )
}

const exportRow = (r: ExchangeRow): string[] => [
  r.journal ? `${r.pieceNum}-${r.journal}` : r.pieceNum,
  r.date,
  r.docRef,
  r.account,
  r.currency,
  r.rate,
  r.debit ? `${r.debit} (Conversion Amt : ${r.debitConverted})` : '',
  r.credit ? `${r.credit} (Conversion Amt : ${r.creditConverted})` : '',
  `${r.newAmount} (Exchange rate at revaluation : ${r.revaluationRate})`,
  r.gainLoss,
]

// The backend's own "Foreign currency revaluation for General ledger" report
// (accountancy/bookkeeping/exchange_list.php): every ledger line revalued at today's rate.
export function ForeignCurrencyRevaluationPage() {
  const [request, setRequest] = useState<ExchangeRequest>(() => ({
    filters: currentMonth(),
    limit: null,
    page: 0,
  }))
  const [draft, setDraft] = useState<ExchangeFilters>(request.filters)
  const { data, isLoading, isFetching, isError, error, refetch } = useExchangeList(request)

  const search = () => setRequest({ ...request, filters: draft, page: 0 })
  const clear = () => {
    const fresh = currentMonth()
    setDraft(fresh)
    setRequest({ ...request, filters: fresh, page: 0 })
  }
  const set = (patch: Partial<ExchangeFilters>) => setDraft((f) => ({ ...f, ...patch }))

  return (
    // The title and filters stay at the top, the column headers under them, and the page total at the
    // bottom; only the rows scroll (same pattern as the Journals list).
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 border-b border-border bg-white px-6 py-3 dark:bg-gray-950 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Coins size={20} className="text-brand" /> Foreign Currency Revaluation For General Ledger
          </h2>
          {data && (
            <div className="flex flex-wrap items-center gap-2">
              <TableExportButtons
                title="Foreign Currency Revaluation"
                getExportData={() => ({
                  headers: data.headers,
                  rows: data.rows.map(exportRow),
                })}
              />
              <select
                value={data.limit}
                onChange={(e) =>
                  setRequest({
                    ...request,
                    limit: Number(e.target.value),
                    page: 0,
                  })
                }
                className={selectCls}
                title="Max. number of records per page"
                aria-label="Rows per page"
              >
                {data.limitOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!data.hasPrev}
                onClick={() => setRequest({ ...request, page: request.page - 1 })}
                aria-label="Previous page"
                className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{data.page + 1}</span>
              <button
                type="button"
                disabled={!data.hasNext}
                onClick={() => setRequest({ ...request, page: request.page + 1 })}
                aria-label="Next page"
                className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <Card className="!h-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              search()
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[8rem_auto_minmax(14rem,1fr)_auto_auto] lg:items-end"
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-text-faint">
              Currency Code :
              <input value={draft.currency} onChange={(e) => set({ currency: e.target.value })} maxLength={3} placeholder="USD" className={inputCls} />
            </label>
            <div className="flex flex-col gap-1 text-xs font-medium text-text-faint">
              Select Date
              <div className="flex items-center gap-1.5">
                <input type="date" value={draft.dateStart} onChange={(e) => set({ dateStart: e.target.value })} className={inputCls} aria-label="Start date" />
                <span>-</span>
                <input type="date" value={draft.dateEnd} onChange={(e) => set({ dateEnd: e.target.value })} className={inputCls} aria-label="End date" />
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs font-medium text-text-faint" title="The lines of this account and of every account before it">
              Chart Of Account
              <SearchableSelect value={draft.account} onChange={(account) => set({ account })} options={[{ value: '', label: '—' }, ...(data?.accountOptions ?? [])]} placeholder="—" />
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-faint" title="The report always revalues at today's exchange rate">
              Exchange Revaluation Date
              <input type="date" value={data?.filters.exchangeDate ?? ''} readOnly disabled className={`${inputCls} cursor-not-allowed opacity-70`} />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isFetching}
                title="Search"
                className="flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                <Search size={14} /> Search
              </button>
              <button
                type="button"
                onClick={clear}
                title="Remove filters"
                className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-text-muted hover:bg-surface-hover"
              >
                <RotateCcw size={14} /> Clear
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label="Loading the revaluation report…" />}
        {isError && <LegacyErrorCard title="Couldn't load the revaluation report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <Card className={`!p-0 overflow-hidden flex-1 min-h-0 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            {data.period && <p className="border-b border-border px-4 py-2 text-xs text-text-muted">{data.period}</p>}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-border">
                    {data.headers.map((h, i) => (
                      <th key={h} className={`${th} ${i >= 6 ? 'text-right' : i === 1 || i === 4 || i === 5 ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={data.headers.length} className="px-3 py-8 text-center italic text-text-faint">
                        No lines in this period.
                      </td>
                    </tr>
                  )}
                  {data.rows.map((r, i) => (
                    <tr key={`${r.pieceNum}-${i}`} className="border-b border-border align-top">
                      <td className="whitespace-nowrap px-3 py-2.5 text-text!">
                        {r.pieceNum ? (
                          <Link to={ROUTES.ledgerPieceDetail.replace(':pieceNum', r.pieceNum)} className="text-brand hover:underline">
                            {r.pieceNum}
                          </Link>
                        ) : null}
                        {r.journal && `-${r.journal}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center text-text-muted">{r.date}</td>
                      <td className="min-w-44 px-3 py-2.5 text-text!">{r.docRef}</td>
                      <td className="min-w-56 px-3 py-2.5 text-text-muted">{r.account}</td>
                      <td className="px-3 py-2.5 text-center text-text-muted">{r.currency}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-text-muted">{r.rate}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">
                        <Amount main={r.debit} note={r.debitConverted} prefix="Conversion Amt : " />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">
                        <Amount main={r.credit} note={r.creditConverted} prefix="Conversion Amt : " />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">
                        <Amount main={r.newAmount} note={r.revaluationRate} prefix="Exchange rate at revaluation : " />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-text!">
                        <span className="inline-flex items-center gap-1">
                          {r.gainLoss}
                          {r.trend === 'up' ? (
                            <ArrowUp size={13} className={GAIN_COLOR.up} aria-label="Gain" />
                          ) : (
                            <ArrowDown size={13} className={GAIN_COLOR[r.trend]} aria-label={r.trend === 'down' ? 'Loss' : 'No change'} />
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {data.totals && data.rows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-10 bg-surface">
                    <tr className="border-t-2 border-border bg-brand/10 font-semibold">
                      <td className="px-3 py-2 text-text!" colSpan={6}>
                        <span title="Total for this page">Total</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{data.totals.debit}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text!">{data.totals.credit}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
