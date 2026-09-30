import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, Link2, Loader2 } from 'lucide-react'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../../shared/components/layout/StickyListLayout'
import { Avatar } from '../../../../shared/components/Avatar'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { ROUTES } from '../../../../routes'
import { CUSTOMER_BIND_PATH, useBindLines, useBindSelectedLines } from '../../bindLines.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'

// accountancy/customer/list.php and accountancy/supplier/list.php — the real
// "Lines of invoices to bind" screen (see bindLinesParser.ts); both pages share
// one form and one row layout. Pick an account per line, tick the lines, choose
// "Bind" and Confirm: that posts the real ventil mass action.
export function CustomerToDispatchList() {
  return <BindToDispatchList path={CUSTOMER_BIND_PATH} invoiceRoute={ROUTES.invoiceDetail} />
}

export function BindToDispatchList({ path, invoiceRoute, title = 'Lines Of Invoices To Bind' }: { path: string; invoiceRoute: string; title?: string }) {
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching, isError, error, refetch } = useBindLines(limit, page, path)
  const bind = useBindSelectedLines(path)
  const confirm = useConfirm()
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [accountFor, setAccountFor] = useState<Record<string, string>>({})
  const [action, setAction] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const accountOptions = useMemo(() => (data?.accounts ?? []).filter((a) => a.value).map((a) => ({ value: a.value, label: a.label })), [data])

  if (isLoading) return <LegacyLoadingCard label="Loading invoice lines…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the invoice lines" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const goTo = (p: number) => {
    setPage(p)
    setTicked(new Set())
    setAccountFor({})
    setResult(null)
  }
  const allTicked = data.rows.length > 0 && data.rows.every((r) => ticked.has(r.lineId))
  const toggle = (id: string) =>
    setTicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const canConfirm = action === 'ventil' && ticked.size > 0 && !bind.isPending

  const handleConfirm = async () => {
    setResult(null)
    const selections = data.rows.filter((r) => ticked.has(r.lineId)).map((r) => ({ lineId: r.lineId, selectValue: r.selectValue, account: accountFor[r.lineId] ?? r.selectedAccount }))
    const ok = await confirm({
      title: 'Bind invoice lines?',
      message: `Bind ${selections.length} invoice line(s) to the chosen accounting accounts?`,
      warningTitle: 'This writes to the accounting bindings.',
      warningMessage: 'Bound lines leave this list and move to "Dispatched".',
      variant: 'default',
      confirmLabel: 'Bind',
    })
    if (!ok) return
    bind.mutate(
      { token: data.token, limit, page, sortfield: data.sortfield, sortorder: data.sortorder, selections },
      {
        onSuccess: (msg) => {
          setResult(msg || `${selections.length} line(s) bound.`)
          setTicked(new Set())
          setAccountFor({})
          setAction('')
        },
      },
    )
  }

  return (
    <StickyListLayout
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Link2 size={20} className="text-brand" /> {title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select value={action} onChange={(e) => setAction(e.target.value)} className={`${selectCls} w-44`}>
              <option value="">-- Select Action --</option>
              <option value="ventil">Bind</option>
            </select>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40"
            >
              {bind.isPending && <Loader2 size={14} className="animate-spin" />} Confirm
            </button>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                goTo(0)
              }}
              className={selectCls}
              title="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page === 0} onClick={() => goTo(page - 1)} className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{page + 1}</span>
              <span className="text-sm text-text-faint">/ {data.pageCount}</span>
              <button
                type="button"
                disabled={page + 1 >= data.pageCount}
                onClick={() => goTo(page + 1)}
                className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      }
    >
      {data.info && <div className="rounded-lg border border-info/40 bg-info-bg/50 px-4 py-3 text-sm text-info-fg">{data.info}</div>}
      {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
      {bind.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {bind.error instanceof Error ? bind.error.message : 'Binding failed.'}
        </div>
      )}

      <ScrollCard className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead className={STICKY_THEAD}>
            <tr className="border-b border-border bg-surface">
              <th className={th}>Id Line</th>
              <th className={th}>Invoice</th>
              <th className={th}>Date</th>
              <th className={th}>Product Ref</th>
              <th className={th}>Product Description</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={th}>Tax Rate</th>
              <th className={th}>Third-Party</th>
              <th className={th}>Country</th>
              <th className={th}>VAT ID</th>
              <th className={th}>Accounting Account Suggested</th>
              <th className={`${th} min-w-52`}>Bind Line With The Accounting Account</th>
              <th className="px-3 py-2.5">
                <input type="checkbox" checked={allTicked} onChange={() => setTicked(allTicked ? new Set() : new Set(data.rows.map((r) => r.lineId)))} aria-label="Select all" />
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center italic text-text-faint">
                  No invoice lines left to bind.
                </td>
              </tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.lineId} className="border-b border-border align-middle">
                <td className="px-3 py-3 font-medium text-text!">{r.lineId}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <Link to={invoiceRoute.replace(':id', r.invoiceId)} className="inline-flex items-center gap-1 text-brand hover:underline">
                    <FileText size={13} /> {r.invoiceRef}
                  </Link>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-text-muted">{r.date}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-500/15">
                      <FileText size={16} />
                    </span>
                    <div>
                      <p className="text-brand font-medium whitespace-nowrap max-w-44 truncate" title={r.productName}>
                        {r.productName}
                      </p>
                      <p className="text-xs text-text-faint whitespace-nowrap">Ref: {r.productRef}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted max-w-36 truncate" title={r.description}>
                  {r.description}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{r.amount}</td>
                <td className="px-3 py-3 whitespace-nowrap font-medium text-danger">{r.taxRate}</td>
                <td className="px-3 py-3">
                  <Link to={ROUTES.customerDetail.replace(':id', r.thirdPartyId)} className="inline-flex items-center gap-2 whitespace-nowrap text-brand hover:underline">
                    <Avatar name={r.thirdParty} size={28} color="bg-blue-500" />
                    {r.thirdParty}
                  </Link>
                </td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{r.country}</td>
                <td className="px-3 py-3 text-text-muted">{r.vatId}</td>
                <td className="px-3 py-3 text-xs whitespace-nowrap">
                  <p>
                    <span className="text-text-faint">Default for product: </span>
                    <span className="font-medium text-text!">{r.defaultAccount}</span>
                  </p>
                  <p>
                    <span className="text-text-faint">This product: </span>
                    {r.productAccount ? <span className="font-medium text-text!">{r.productAccount}</span> : <span className="text-warning-fg">Not defined</span>}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <SearchableSelect
                    value={accountFor[r.lineId] ?? r.selectedAccount}
                    onChange={(v) => setAccountFor((s) => ({ ...s, [r.lineId]: v }))}
                    options={accountOptions}
                    placeholder="Select account"
                  />
                </td>
                <td className="px-3 py-3">
                  <input type="checkbox" checked={ticked.has(r.lineId)} onChange={() => toggle(r.lineId)} aria-label={`Select line ${r.lineId}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollCard>
    </StickyListLayout>
  )
}
