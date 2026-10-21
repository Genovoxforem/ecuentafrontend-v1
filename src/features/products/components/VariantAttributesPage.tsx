import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Loader2, Plus, SlidersHorizontal, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import type { VariantAttribute } from '../../../api/products'
import { useAttributeAction, useVariantAttributeList } from '../productTools.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const COLUMNS = ['Ref', 'Label', '# of Different Values', '# of Linked Products', '']
const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Variant attributes — variants/fapi/attributes.php (list, create, move up/down;
// the card and its values are VariantAttributeDetailPage). An older backend
// falls back to scraping variants/list.php, read-only.
export function VariantAttributesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useVariantAttributeList()
  const action = useAttributeAction()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ref: '', label: '' })
  const [formError, setFormError] = useState('')
  const [moving, setMoving] = useState<string | null>(null)
  const [listError, setListError] = useState('')
  const rows = data?.rows ?? []
  const live = data?.source === 'api'

  function create() {
    if (!form.ref.trim() || !form.label.trim()) {
      setFormError('Ref and label are required.')
      return
    }
    setFormError('')
    action.mutate(
      { action: 'create', ref: form.ref.trim(), label: form.label.trim() },
      {
        onSuccess: (created) => {
          const id = (created as VariantAttribute | undefined)?.id
          setForm({ ref: '', label: '' })
          setShowForm(false)
          if (id) navigate(ROUTES.productVariantAttributeDetail.replace(':id', String(id)))
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not create the attribute.'),
      },
    )
  }

  function move(id: string, direction: 'up' | 'down') {
    setListError('')
    setMoving(`${id}-${direction}`)
    action.mutate(
      { action: 'move', id: Number(id), direction },
      {
        onError: (e) => setListError(e instanceof Error ? e.message : 'Could not move the attribute.'),
        onSettled: () => setMoving(null),
      },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <SlidersHorizontal size={20} className="text-brand" /> Variant Attributes for Products
        </h2>
        {data?.canCreate && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Close' : 'New attribute'}
          </button>
        )}
      </div>

      {showForm && (
        <Card className="!h-auto">
          {formError && <p className="mb-3 text-sm font-medium text-danger">{formError}</p>}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">
                Ref <span className="text-danger">*</span>
              </label>
              <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} className={inputCls} placeholder="e.g. SIZE" />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">
                Label <span className="text-danger">*</span>
              </label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} placeholder="e.g. Size" />
            </div>
            <button type="button" onClick={create} disabled={action.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              Save
            </button>
          </div>
          <p className="mt-2 text-xs text-text-faint">The ref is stored upper-cased, with characters that cannot go in a file name replaced.</p>
        </Card>
      )}

      {listError && <p className="text-sm font-medium text-danger">{listError}</p>}
      {isError && <LegacyErrorCard title="Couldn't load variant attributes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading variant attributes…" />}

      {data && (
        <Card className="!p-0 !h-auto overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {COLUMNS.map((col, i) => (
                    <th key={col || i} className={`font-medium px-3 py-2.5 whitespace-nowrap ${col.startsWith('#') ? 'text-right' : ''}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No variant attributes defined yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={row.id ?? row.ref} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        {row.id ? (
                          <Link to={ROUTES.productVariantAttributeDetail.replace(':id', row.id)} className="text-brand hover:underline font-medium">
                            {row.ref}
                          </Link>
                        ) : (
                          row.ref
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-text!">{row.label}</td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.valueCount}</td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.productCount}</td>
                      <td className="px-3 py-2.5">
                        {live && row.id && (
                          <span className="flex justify-end gap-1">
                            {(['up', 'down'] as const).map((dir) => {
                              const Icon = dir === 'up' ? ArrowUp : ArrowDown
                              const edge = dir === 'up' ? i === 0 : i === rows.length - 1
                              return (
                                <button
                                  key={dir}
                                  type="button"
                                  onClick={() => move(row.id!, dir)}
                                  disabled={edge || moving !== null}
                                  aria-label={`Move ${row.ref} ${dir}`}
                                  className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-surface-hover hover:text-brand disabled:opacity-30"
                                >
                                  {moving === `${row.id}-${dir}` ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                                </button>
                              )
                            })}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
