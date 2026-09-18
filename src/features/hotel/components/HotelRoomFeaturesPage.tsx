import { useState } from 'react'
import { Sparkles, LoaderCircle, Trash2, X, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelFeatures, useHotelSaveFeatureFull, useHotelDelFeature, useHotelDelService, useHotelToken, type SaveFeatureFullInput } from '../hotel.queries'

const fieldCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const FEATURE_TYPES: { value: SaveFeatureFullInput['featureType']; label: string }[] = [
  { value: 'complementary', label: 'Complementary' },
  { value: 'facility', label: 'Facility' },
  { value: 'amenities', label: 'Amenities' },
]

// Matches the real booking/settings/feature.php page's own "Add Feature"
// offcanvas exactly: Feature Type / Feature Name / Amount / Status — see
// useHotelSaveFeatureFull's own comment for the real endpoint behind it.
function AddFeaturePanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const save = useHotelSaveFeatureFull()
  const [featureType, setFeatureType] = useState<SaveFeatureFullInput['featureType']>('complementary')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('0')
  const [status, setStatus] = useState<1 | 2>(1)
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) return setError('Feature name is required.')
    setError('')
    save.mutate(
      { featureType, name, amount: Number(amount) || 0, status },
      { onSuccess: onSaved, onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-surface border-l border-border p-5 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Add Feature</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Feature Type *</label>
          <select value={featureType} onChange={(e) => setFeatureType(e.target.value as SaveFeatureFullInput['featureType'])} className={fieldCls}>
            {FEATURE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Feature Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} autoFocus />
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Amount *</label>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldCls} />
        </div>
        <div>
          <label className="block text-xs text-danger mb-1">Status *</label>
          <select value={status} onChange={(e) => setStatus(Number(e.target.value) as 1 | 2)} className={fieldCls}>
            <option value={1}>Active</option>
            <option value={2}>Inactive</option>
          </select>
        </div>
        <p className="text-xs text-text-faint">
          Chargeable <em>services</em> (the ones that show as real ZRA-classified products below) still aren't created here — those need Ecuenta Products'
          own full VAT/unit/tax-code form. This adds a plain feature/amenity row, same as the real page's own default "Add Feature" flow.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="button"
          disabled={save.isPending || !name.trim()}
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : null} Save
        </button>
      </div>
    </div>
  )
}

// Real via custom/hotel/api.php?r=features, plus booking/settings/
// booking_master.ajax.php (action=save_features — see
// useHotelSaveFeatureFull's own comment) for creating a feature/amenity,
// and a=delfeature/a=delservice (Hotel Suite API) for deleting either kind.
// Chargeable services (src='prod') are real Dolibarr products — see
// hotel.queries.ts's own comment on why creating those stays out of scope
// here.
export function HotelRoomFeaturesPage() {
  const { data: token } = useHotelToken()
  const { data: features, isLoading, isError, error, refetch } = useHotelFeatures()
  const delFeature = useHotelDelFeature()
  const delService = useHotelDelService()
  const [showAdd, setShowAdd] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  function handleDelete(id: string, isService: boolean) {
    if (!token || !confirm('Delete this?')) return
    setBusyId(id)
    const mutate = isService ? delService : delFeature
    mutate.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <Sparkles size={22} />
          </span>
          <h2 className="text-lg font-bold text-text!">Room Features</h2>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          + Add Feature
        </button>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading features…" />}
      {isError && <LegacyErrorCard title="Couldn't load features" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <Card className="!p-0 overflow-hidden">
          {(features ?? []).length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">None yet — tap "+ Add Feature" to create one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Sl.No</th>
                  <th className="font-medium px-3 py-2">Feature / Service</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2 text-right">Amount</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {(features ?? []).map((f, i) => {
                  const isService = f.src === 'prod'
                  const amount = isService ? (f.amount_ttc ?? f.amount) : f.amount
                  return (
                    <tr key={f.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 text-text-muted">{i + 1}</td>
                      <td className="px-3 py-2.5 text-text!">{f.name}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isService ? 'bg-info-bg text-info-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                          {isService ? 'Chargeable' : (f.ftype ? f.ftype.charAt(0).toUpperCase() + f.ftype.slice(1) : 'Complimentary')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-muted">{amount > 0 ? `K${Number(amount).toLocaleString()}` : 'Free'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                          {f.status === 1 ? 'Active' : 'Off'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          disabled={!token || busyId === f.id}
                          onClick={() => handleDelete(f.id, isService)}
                          className="p-1.5 rounded-md text-danger hover:bg-surface-hover disabled:opacity-50"
                        >
                          {busyId === f.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Features/amenities are added here directly, matching the real page's own Feature Type/Name/Amount/Status form. Chargeable services are real
          ZRA-classified products (VAT, unit, tax code) — create those in Ecuenta Products and they'll show up above automatically.
        </p>
      </Card>

      {showAdd && <AddFeaturePanel onClose={() => setShowAdd(false)} onSaved={() => setShowAdd(false)} />}
    </div>
  )
}
