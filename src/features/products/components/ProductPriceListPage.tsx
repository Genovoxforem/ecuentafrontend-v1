import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, LoaderCircle, Plus, Store, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney } from '../../../utils/format'
import {
  getProductPriceList,
  getProductPriceListHistory,
  listProductPriceLists,
  productPriceListAction,
  type PriceListApplyResult,
  type PriceListRow,
} from '../../../api/products'
import { useProductOptions } from '../products.queries'
import { LegacyErrorCard, LegacyLoadingCard } from './LegacyReportStates'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'
const dateOf = (v: unknown) => (typeof v === 'number' && v > 0 ? new Date(v * 1000).toLocaleDateString('en-GB') : String(v ?? ''))

interface LineRow {
  line_id: number
  product_id: number
  product_ref: string
  product_label: string
  min_price: number | null
  max_price: number | null
  current_price: number
  current_price_ttc: number
  price_base_type: string
}

// Saved bulk price-update lists (product/fapi/price_lists.php): build a list, put products on it, apply it
// and see what it did. Apply is a dry run first (every product's before and after) and only writes on
// confirm; only one list is active at a time, so applying one switches the previous one off.
export function ProductPriceListPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [openId, setOpenId] = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [message, setMessage] = useState('')
  const lists = useQuery({ queryKey: ['products', 'priceLists'], queryFn: listProductPriceLists })
  const history = useQuery({ queryKey: ['products', 'priceLists', 'history'], queryFn: () => getProductPriceListHistory() })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products', 'priceLists'] })

  const remove = useMutation({
    mutationFn: async (list: PriceListRow) => productPriceListAction('delete', { id: list.id, confirm: true }),
    onSuccess: () => refresh(),
    onError: (e) => setMessage(e instanceof Error ? e.message : 'Could not delete the list.'),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Store size={22} className="text-brand" /> Product Price List
        </h2>
        <InBanner>
          <button type="button" onClick={() => setShowNew(true)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            New price list
          </button>
        </InBanner>
      </div>

      {message && (
        <p role="alert" className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          {message}
        </p>
      )}
      {showNew && <NewListForm onDone={() => { setShowNew(false); refresh() }} onCancel={() => setShowNew(false)} />}

      {lists.isLoading && <LegacyLoadingCard label="Loading the price lists…" />}
      {lists.isError && <LegacyErrorCard title="Couldn't load the price lists" message={lists.error instanceof Error ? lists.error.message : 'Unknown error.'} onRetry={() => lists.refetch()} />}

      {lists.data && lists.data.items.length === 0 && (
        <div className="mx-4 flex h-fit flex-col items-center gap-3 rounded-md border border-brand bg-brand/10 px-6 py-14 text-center">
          <p className="text-xl font-semibold text-text!">No Price Updates Yet</p>
          <p className="mt-2 text-sm text-brand">Create a list, add products with their new prices, then apply it.</p>
          <button type="button" onClick={() => setShowNew(true)} className="mt-4 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-brand-hover">
            New price list
          </button>
          <Link to={ROUTES.productPriceUpdate} className="text-xs text-text-muted hover:text-brand hover:underline">
            Or change prices product by product
          </Link>
        </div>
      )}

      {lists.data && lists.data.items.length > 0 && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="w-8 px-2" />
                  <th className="font-medium px-4 py-2.5">List</th>
                  <th className="font-medium px-4 py-2.5">Description</th>
                  <th className="font-medium px-4 py-2.5 text-right">Products</th>
                  <th className="font-medium px-4 py-2.5">Created</th>
                  <th className="font-medium px-4 py-2.5">By</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {lists.data.items.map((l) => (
                  <ListRows
                    key={l.id}
                    list={l}
                    open={openId === l.id}
                    onToggle={() => setOpenId(openId === l.id ? null : l.id)}
                    onChanged={refresh}
                    onDelete={async () => {
                      const ok = await confirm({
                        title: 'Delete this price list?',
                        message: `"${l.label}" and its lines are deleted. Prices it already applied to products are not reverted.`,
                        confirmLabel: 'Delete',
                      })
                      if (ok) remove.mutate(l)
                    }}
                    onMessage={setMessage}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {lists.data.note && <p className="border-t border-border px-4 py-2 text-xs text-text-faint">{lists.data.note}</p>}
        </Card>
      )}

      <Card className="!h-auto !p-0 overflow-hidden">
        <h3 className="px-4 py-3 border-b border-border font-semibold text-text!">Applied price history</h3>
        {history.isLoading ? (
          <p className="p-4 text-sm text-text-faint">Loading…</p>
        ) : !history.data || history.data.items.length === 0 ? (
          <p className="p-4 text-sm text-text-faint italic">No price list has been applied yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {Object.keys(history.data.items[0]).filter((k) => typeof history.data.items[0][k] !== 'object').map((k) => (
                    <th key={k} className="font-medium px-4 py-2.5">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.data.items.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Object.entries(row).filter(([, v]) => typeof v !== 'object').map(([k, v]) => (
                      <td key={k} className="px-4 py-2 text-text-muted">
                        {/date|created/i.test(k) ? dateOf(v) : String(v ?? '')}
                      </td>
                    ))}
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

function NewListForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const create = useMutation({
    mutationFn: () => productPriceListAction('create', { label: label.trim(), description: description.trim(), min_price: Number(minPrice) || 0, max_price: Number(maxPrice) || 0 }),
    onSuccess: onDone,
  })
  return (
    <Card className="!h-auto">
      <h3 className="font-semibold text-text! mb-3">New price list</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-faint">
          Label *
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-faint">
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-faint">
          Lowest price (whole units)
          <input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-faint">
          Highest price (whole units)
          <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={inputCls} />
        </label>
      </div>
      {create.isError && <p role="alert" className="mt-2 text-sm text-danger">{create.error instanceof Error ? create.error.message : 'Could not create the list.'}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={!label.trim() || create.isPending} onClick={() => create.mutate()} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-1.5 text-sm text-text-muted hover:bg-surface-hover">
          Cancel
        </button>
      </div>
    </Card>
  )
}

function ListRows({
  list,
  open,
  onToggle,
  onChanged,
  onDelete,
  onMessage,
}: {
  list: PriceListRow
  open: boolean
  onToggle: () => void
  onChanged: () => void
  onDelete: () => void
  onMessage: (m: string) => void
}) {
  return (
    <>
      <tr className="border-b border-border">
        <td className="px-2">
          <button type="button" onClick={onToggle} aria-label={open ? 'Hide lines' : 'Show lines'} className="p-1 text-text-faint hover:text-text">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-4 py-2.5 font-medium text-text!">{list.label}</td>
        <td className="px-4 py-2.5 text-text-muted">{list.description || '—'}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{list.line_count ?? 0}</td>
        <td className="px-4 py-2.5 text-text-muted">{dateOf(list.date_created)}</td>
        <td className="px-4 py-2.5 text-text-muted">{String(list.author ?? '')}</td>
        <td className="px-4 py-2.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${list.is_active ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>{list.is_active ? 'Active' : 'Not applied'}</span>
        </td>
        <td className="px-4 py-2.5 text-right">
          <button type="button" onClick={onDelete} title="Delete the list" className="p-1.5 text-text-faint hover:text-danger">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-surface-alt/40">
          <td colSpan={8} className="px-4 py-3">
            <ListDetail id={list.id} onChanged={onChanged} onMessage={onMessage} />
          </td>
        </tr>
      )}
    </>
  )
}

function ListDetail({ id, onChanged, onMessage }: { id: number; onChanged: () => void; onMessage: (m: string) => void }) {
  const queryClient = useQueryClient()
  const { data: products } = useProductOptions()
  const detail = useQuery({ queryKey: ['products', 'priceLists', 'detail', id], queryFn: () => getProductPriceList(id) })
  const [product, setProduct] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [preview, setPreview] = useState<PriceListApplyResult | null>(null)
  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: ['products', 'priceLists', 'detail', id] })
    onChanged()
  }
  const fail = (e: unknown) => onMessage(e instanceof Error ? e.message : 'The price list action failed.')

  const addLine = useMutation({
    mutationFn: () => productPriceListAction('add_line', { id, product: Number(product), ...(minPrice ? { min_price: Number(minPrice) } : {}), ...(maxPrice ? { max_price: Number(maxPrice) } : {}) }),
    onSuccess: () => { setProduct(''); setMaxPrice(''); setMinPrice(''); reload() },
    onError: fail,
  })
  const delLine = useMutation({ mutationFn: (lineId: number) => productPriceListAction('delete_line', { id, line_id: lineId }), onSuccess: reload, onError: fail })
  const dryRun = useMutation({ mutationFn: () => productPriceListAction<PriceListApplyResult>('apply', { id }), onSuccess: setPreview, onError: fail })
  const apply = useMutation({
    mutationFn: () => productPriceListAction<PriceListApplyResult>('apply', { id, confirm: true }),
    onSuccess: () => { setPreview(null); void queryClient.invalidateQueries({ queryKey: ['products'] }); reload() },
    onError: fail,
  })

  if (detail.isLoading) return <p className="text-sm text-text-faint">Loading…</p>
  if (detail.isError || !detail.data) return <p className="text-sm text-danger">Could not load this list.</p>
  const lines = detail.data.lines as unknown as LineRow[]
  const options = (products ?? []).map((p) => ({ value: p.id, label: p.label, description: p.ref, keywords: `${p.ref} ${p.barcode}` }))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-3 py-2">Product</th>
              <th className="font-medium px-3 py-2 text-right">Current price</th>
              <th className="font-medium px-3 py-2 text-right">Min price</th>
              <th className="font-medium px-3 py-2 text-right">New price</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-text-faint italic">
                  No products on this list yet.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.line_id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-text!">
                    {l.product_ref} — {l.product_label}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                    {formatMoney(l.price_base_type === 'TTC' ? l.current_price_ttc : l.current_price)} <span className="text-xs text-text-faint">{l.price_base_type === 'TTC' ? 'inc. tax' : 'excl. tax'}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-muted">{l.min_price ? formatMoney(l.min_price) : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-text!">{l.max_price ? formatMoney(l.max_price) : '—'}</td>
                  <td className="px-2 text-center">
                    <button type="button" onClick={() => delLine.mutate(l.line_id)} title="Remove from the list" className="p-1 text-text-faint hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-72">
          <SearchableSelect value={product} onChange={setProduct} options={options} placeholder="Add a product…" />
        </div>
        <label className="flex flex-col gap-1 text-xs text-text-faint">
          New price
          <input type="number" min={0} step="0.01" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={`${inputCls} !w-28`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-faint">
          Min price
          <input type="number" min={0} step="0.01" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={`${inputCls} !w-28`} />
        </label>
        <button type="button" disabled={!product || (!maxPrice && !minPrice) || addLine.isPending} onClick={() => addLine.mutate()} className="flex items-center gap-1.5 rounded-md border border-brand/40 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50">
          <Plus size={14} /> Add
        </button>
        <button type="button" disabled={lines.length === 0 || dryRun.isPending} onClick={() => dryRun.mutate()} className="ml-auto flex items-center gap-1.5 rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {dryRun.isPending && <LoaderCircle size={14} className="animate-spin" />} Preview and apply
        </button>
      </div>

      {preview && (
        <div className="rounded-md border border-warning/40 bg-warning-bg/40 p-3 text-sm">
          <p className="font-medium text-text!">
            {preview.would_change ?? 0} of {preview.matched ?? 0} product price(s) would change. Nothing has been written yet.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-text-muted">
            {(preview.rows ?? []).map((r, i) => (
              <li key={i}>
                {r.ref}: {formatMoney(r.price_from)} → {formatMoney(r.price_to)} {r.price_base === 'TTC' ? 'inc. tax' : 'excl. tax'} <span className="text-text-faint">({r.status.replace(/_/g, ' ')})</span>
              </li>
            ))}
          </ul>
          {Array.isArray(preview.deactivates) && preview.deactivates.length > 0 ? (
            <p className="mt-2 text-xs text-warning-fg">Only one list is active at a time: applying this one switches the current active list off.</p>
          ) : preview.deactivates ? (
            <p className="mt-2 text-xs text-warning-fg">Only one list is active at a time: applying this one switches the current active list off.</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={apply.isPending} onClick={() => apply.mutate()} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              {apply.isPending ? 'Applying…' : 'Apply these prices'}
            </button>
            <button type="button" onClick={() => setPreview(null)} className="rounded-md border border-border px-4 py-1.5 text-sm text-text-muted hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
