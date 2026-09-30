import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Info, Loader2, Package, RotateCcw, Save, Search } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../../shared/components/ConfirmDialog'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { ROUTES } from '../../../../routes'
import { useProductAccounts, useSaveProductAccounts } from '../../productAccounts.queries'
import type { ProductAccountFilters } from '../../productAccountsParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const th = 'font-semibold px-3 py-2.5 text-left text-xs text-text whitespace-nowrap'

// The backend page has no filter reset, so "no filters" is the empty search
// (validity filter empty = show every product, not just those without an account).
const NO_FILTERS: ProductAccountFilters = { ref: '', label: '', vat: '', onsell: '-1', currentAccount: '', currentAccountValid: '' }

// The initial view matches what the real page shows on first open: products
// that have no valid dedicated account yet.
const INITIAL_FILTERS: ProductAccountFilters = { ...NO_FILTERS, currentAccountValid: 'withoutvalidaccount' }

// accountancy/admin/productaccount.php — the real "Products accounts" screen
// (see productAccountsParser.ts). Choose the accounting account per product,
// tick the products and Save: that posts the page's own update action.
export function ProductAccountsList() {
  const [mode, setMode] = useState('ACCOUNTANCY_SELL')
  // The radio the user has picked; it takes effect on "Refresh", as on the backend page.
  const [modeDraft, setModeDraft] = useState('ACCOUNTANCY_SELL')
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<ProductAccountFilters>(INITIAL_FILTERS)
  const [draft, setDraft] = useState<ProductAccountFilters>(INITIAL_FILTERS)
  const { data, isLoading, isFetching, isError, error, refetch } = useProductAccounts({ mode, limit, page, filters })
  const save = useSaveProductAccounts()
  const confirm = useConfirm()
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [accountFor, setAccountFor] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)

  const accountOptions = useMemo(() => (data?.accounts ?? []).filter((a) => a.value).map((a) => ({ value: a.value, label: a.label })), [data])

  if (isLoading) return <LegacyLoadingCard label="Loading product accounts…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the product accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const resetSelection = () => {
    setTicked(new Set())
    setAccountFor({})
    setResult(null)
  }
  const goTo = (p: number) => {
    setPage(p)
    resetSelection()
  }
  const applyFilters = (f: ProductAccountFilters) => {
    setFilters(f)
    goTo(0)
  }
  const allTicked = data.rows.length > 0 && data.rows.every((r) => ticked.has(r.id))
  const toggle = (id: string) =>
    setTicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const modeLabel = data.modes.find((m) => m.value === mode)?.label ?? mode

  const handleSave = async () => {
    setResult(null)
    const selections = data.rows.filter((r) => ticked.has(r.id)).map((r) => ({ productId: r.id, account: accountFor[r.id] ?? r.selectedAccount }))
    const ok = await confirm({
      title: 'Save product accounts?',
      message: `Assign the chosen accounting account to ${selections.length} product(s) (${modeLabel})?`,
      warningTitle: 'This writes to the products.',
      warningMessage: 'The dedicated accounting account of each ticked product is overwritten.',
      variant: 'default',
      confirmLabel: 'Save',
    })
    if (!ok) return
    save.mutate(
      { token: data.token, mode, limit, page, sortfield: data.sortfield, sortorder: data.sortorder, selections },
      {
        onSuccess: (msg) => {
          setResult(msg || `${selections.length} product(s) updated.`)
          setTicked(new Set())
          setAccountFor({})
        },
      },
    )
  }

  const setDraftField = (k: keyof ProductAccountFilters, v: string) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Package size={20} className="text-brand" /> Products accounts
      </h2>

      {data.intro && (
        <Card className="!h-auto flex items-start gap-2 !bg-info-bg">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-sm text-info-fg">{data.intro}</p>
        </Card>
      )}

      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className={th}>Options</th>
              <th className={th}>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.modes.map((m) => (
              <tr key={m.value} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-2 text-text">
                    <input type="radio" name="accounting_product_mode" value={m.value} checked={modeDraft === m.value} onChange={() => setModeDraft(m.value)} />
                    {m.label}
                  </label>
                </td>
                <td className="px-3 py-2 text-text-muted">{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div>
        <button
          type="button"
          onClick={() => {
            setMode(modeDraft)
            goTo(0)
            refetch()
          }}
          disabled={isFetching}
          className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {isFetching && <Loader2 size={14} className="animate-spin" />} Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-text!">List Of Products/Services</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={ticked.size === 0 || save.isPending}
            className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40"
          >
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              goTo(0)
            }}
            className={inputCls}
            title="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="button" disabled={page === 0} onClick={() => goTo(page - 1)} className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span className="grid h-9 min-w-9 place-items-center rounded-md bg-brand px-2 text-sm text-white">{page + 1}</span>
          <button
            type="button"
            disabled={data.rows.length < limit}
            onClick={() => goTo(page + 1)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
      {save.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {save.error instanceof Error ? save.error.message : 'Saving failed.'}
        </div>
      )}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          applyFilters(draft)
        }}
      >
        <input value={draft.ref} onChange={(e) => setDraftField('ref', e.target.value)} placeholder="Ref." className={`${inputCls} w-28`} aria-label="Filter by ref" />
        <input value={draft.label} onChange={(e) => setDraftField('label', e.target.value)} placeholder="Label" className={`${inputCls} w-40`} aria-label="Filter by label" />
        <input value={draft.vat} onChange={(e) => setDraftField('vat', e.target.value)} placeholder="Tax %" className={`${inputCls} w-20`} aria-label="Filter by tax rate" />
        <select value={draft.onsell} onChange={(e) => setDraftField('onsell', e.target.value)} className={inputCls} aria-label="Filter by for sale">
          <option value="-1">For sale: any</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
        <input value={draft.currentAccount} onChange={(e) => setDraftField('currentAccount', e.target.value)} placeholder="Current account" className={`${inputCls} w-36`} aria-label="Filter by current account" />
        <select value={draft.currentAccountValid} onChange={(e) => setDraftField('currentAccountValid', e.target.value)} className={inputCls} aria-label="Filter by dedicated account">
          <option value="">Any dedicated account</option>
          <option value="withoutvalidaccount">Without valid dedicated account</option>
          <option value="withvalidaccount">With valid dedicated account</option>
        </select>
        <button type="submit" className="flex items-center gap-1.5 h-9 rounded-md border border-border px-3 text-sm text-text hover:bg-surface" title="Search">
          <Search size={14} /> Search
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(NO_FILTERS)
            applyFilters(NO_FILTERS)
          }}
          className="flex items-center gap-1.5 h-9 rounded-md border border-border px-3 text-sm text-text-muted hover:bg-surface"
          title="Remove filters"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </form>

      <Card className={`!h-auto !p-0 overflow-hidden transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={th}>Ref.</th>
                <th className={th}>Label</th>
                <th className={th}>Tax Rate</th>
                <th className={th}>For Sale</th>
                <th className={th}>Current Dedicated Account</th>
                <th className={`${th} min-w-56`}>New Account To Assign</th>
                <th className="px-3 py-2.5">
                  <input type="checkbox" checked={allTicked} onChange={() => setTicked(allTicked ? new Set() : new Set(data.rows.map((r) => r.id)))} aria-label="Select all" />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center italic text-text-faint">
                    No products match.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-border align-middle">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-500/15">
                        <Package size={16} />
                      </span>
                      <div>
                        <Link to={ROUTES.productDetail.replace(':id', r.id)} className="block max-w-56 truncate font-medium text-brand hover:underline" title={r.name}>
                          {r.name}
                        </Link>
                        <p className="whitespace-nowrap text-xs text-text-faint">Ref: {r.ref}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-text-muted">{r.label}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-text-muted">{r.taxRate}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-text-muted">{r.forSale}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{r.currentAccount || <span className="text-warning-fg">Not defined</span>}</td>
                  <td className="px-3 py-3">
                    <SearchableSelect
                      value={accountFor[r.id] ?? r.selectedAccount}
                      onChange={(v) => setAccountFor((s) => ({ ...s, [r.id]: v }))}
                      options={accountOptions}
                      placeholder="Select account"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={ticked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select product ${r.ref}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
