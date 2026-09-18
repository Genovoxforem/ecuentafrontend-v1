import { useMemo, useState } from 'react'
import { Pencil, Trash2, X, LoaderCircle, Receipt, Smartphone, Coins as CoinsIcon } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import {
  useHotelSettingsBundle,
  useHotelSaveType,
  useHotelDelType,
  useHotelRoomsAdmin,
  useHotelSaveRoom,
  useHotelCreateRoomFormOptions,
  useHotelVatRates,
  useHotelUnits,
  useHotelTlCodes,
  useHotelFeatures,
  useHotelSaveFeatureFull,
  useHotelDelFeature,
  useHotelPayCfg,
  useHotelSavePayAcct,
  useHotelToken,
  type HotelTypeKind,
  type HotelSettingsTypeRow,
} from '../hotel.queries'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const FEATURE_TYPE_LABEL: Record<string, string> = { complementary: 'Complimentary Amenities', facility: 'Facility', amenities: 'Amenities' }

// Real via custom/hotel/api.php?r=settings (Floors/Room Types/Bed Types/
// Booking Types — a=savetype/deltype&kind=...), r=rooms_admin (a=saveroom,
// the Rooms card's own "+ Add Suite"), r=features (a=save_features via
// booking_master.ajax.php) and r=paycfg — the Hotel Suite's own real
// Settings tab, confirmed live to be a full property-configuration
// dashboard (Floors/Room Types/Bed Types/Booking Types/Rooms/Room
// Features/Integrations/Payments all inline), not just the Payments-only
// leftover this page used to be. Floors and Room Types both genuinely fail
// to persist (confirmed live: savetype returns {"ok":true} but silently
// doesn't save) and the Rooms card's own "+ Add Suite" genuinely fails
// with "Could not create room product" (a=saveroom, the same confirmed
// bug documented in HotelAddRoomPage.tsx) — both buttons stay, matching
// the real page exactly, since it offers them too despite the same
// backend bugs. "Integrations" is static descriptive content in the real
// page's own source (not backed by any API), reproduced verbatim.
function TypeSection({ kind, label }: { kind: HotelTypeKind; label: string }) {
  const { data: settings, isLoading } = useHotelSettingsBundle()
  const { data: token } = useHotelToken()
  const save = useHotelSaveType()
  const del = useHotelDelType()
  const [editing, setEditing] = useState<{ id?: string; name: string; status: 0 | 1 | 2 } | null>(null)
  const [saveError, setSaveError] = useState('')

  const rows: HotelSettingsTypeRow[] = settings?.[kind === 'roomtype' ? 'roomtype' : kind] ?? []

  function handleSave() {
    if (!token || !editing || !editing.name.trim()) return
    setSaveError('')
    save.mutate(
      { kind, id: editing.id, name: editing.name, status: editing.status, token },
      { onSuccess: () => setEditing(null), onError: (e) => setSaveError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">{label}</h3>
        <button type="button" onClick={() => setEditing({ name: '', status: 1 })} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
          + Add
        </button>
      </div>

      {editing && (
        <div className="mb-3 flex items-center gap-2">
          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" className={`flex-1 ${fieldCls}`} />
          <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: Number(e.target.value) as 0 | 1 | 2 })} className={fieldCls}>
            <option value={1}>Active</option>
            <option value={2}>Inactive</option>
          </select>
          <button type="button" disabled={!token || save.isPending} onClick={handleSave} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs text-white disabled:opacity-50">
            {save.isPending && <LoaderCircle size={12} className="animate-spin" />} Save
          </button>
          <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-md text-text-faint hover:bg-surface-hover">
            <X size={14} />
          </button>
        </div>
      )}
      {saveError && <p className="text-xs text-danger mb-2">{saveError}</p>}

      {isLoading ? (
        <p className="text-sm text-text-faint py-2">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">None yet — add one.</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-text!">{r.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!token}
                  onClick={() => token && save.mutate({ kind, id: r.id, name: r.name, status: r.status === 1 ? 2 : 1, token })}
                  className={`text-xs px-2 py-0.5 rounded-full ${r.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}
                >
                  {r.status === 1 ? 'Active' : 'Inactive'}
                </button>
                <button type="button" onClick={() => setEditing({ id: r.id, name: r.name, status: r.status })} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover">
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  disabled={!token}
                  onClick={() => token && confirm(`Delete "${r.name}"?`) && del.mutate({ kind, id: r.id, token })}
                  className="p-1.5 rounded-md text-danger hover:bg-surface-hover"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function RoomsSection() {
  const { data: rooms, isLoading } = useHotelRoomsAdmin()
  const { data: token } = useHotelToken()
  const { data: formOptions } = useHotelCreateRoomFormOptions()
  const { data: vatRates } = useHotelVatRates()
  const { data: units } = useHotelUnits()
  const { data: tlCodes } = useHotelTlCodes()
  const save = useHotelSaveRoom()

  const [showForm, setShowForm] = useState(false)
  const [no, setNo] = useState('')
  const [ty, setTy] = useState('')
  const [floor, setFloor] = useState('')
  const [rate, setRate] = useState('0')
  const [status, setStatus] = useState<0 | 1 | 2>(1)
  const [formError, setFormError] = useState('')

  const qtyUnits = (units ?? []).filter((u) => u.ut === 'qty')
  const packUnits = (units ?? []).filter((u) => u.ut === 'pack')

  function handleSave() {
    if (!token) return
    if (!no.trim() || !ty || !floor) return setFormError('Suite #, Type and Floor are all required.')
    setFormError('')
    const vat = vatRates?.[0]
    const tl = tlCodes?.[0]
    save.mutate(
      {
        no,
        ty,
        floor,
        rate: Number(rate) || 0,
        status,
        cls: 'Service',
        country: '239',
        unit: String(qtyUnits[0]?.id ?? '31'),
        packing: String(packUnits[0]?.id ?? '45'),
        pbt: 'HT',
        tva: Number(vat?.taux ?? 16),
        vatcode: vat?.code ?? '',
        tl: tl ? `${tl.rate} (${tl.code})` : '',
        token,
      },
      {
        onSuccess: () => {
          setShowForm(false)
          setNo('')
          setTy('')
          setFloor('')
          setRate('0')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Rooms</h3>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
          + Add Suite
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-lg border border-border">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input value={no} onChange={(e) => setNo(e.target.value.slice(0, 6))} placeholder="Suite #" className={fieldCls} />
            <select value={ty} onChange={(e) => setTy(e.target.value)} className={fieldCls}>
              <option value="">Type</option>
              {(formOptions?.roomTypes ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select value={floor} onChange={(e) => setFloor(e.target.value)} className={fieldCls}>
              <option value="">Floor</option>
              {(formOptions?.floors ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate" className={fieldCls} />
            <select value={status} onChange={(e) => setStatus(Number(e.target.value) as 0 | 1 | 2)} className={fieldCls}>
              <option value={1}>Active</option>
              <option value={2}>Out of service</option>
            </select>
          </div>
          {formError && <p className="text-xs text-danger mt-2">{formError}</p>}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={!token || save.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {save.isPending && <LoaderCircle size={12} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-text-faint py-2">Loading…</p>
      ) : rooms && rooms.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">No suites yet — add one.</p>
      ) : (
        <div className="divide-y divide-border">
          {(rooms ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-text!">
                {r.no} <span className="text-text-faint">· {r.type}</span>
              </span>
              <span className="text-text-muted">K{Number(r.rate ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function FeaturesSection() {
  const { data: features, isLoading } = useHotelFeatures()
  const { data: token } = useHotelToken()
  const save = useHotelSaveFeatureFull()
  const del = useHotelDelFeature()

  const [showForm, setShowForm] = useState(false)
  const [featureType, setFeatureType] = useState<'complementary' | 'facility' | 'amenities'>('complementary')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('0')
  const [status, setStatus] = useState<1 | 2>(1)
  const [formError, setFormError] = useState('')

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof features>()
    for (const f of features ?? []) {
      const key = f.ftype || 'complementary'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    return groups
  }, [features])

  function handleSave() {
    if (!name.trim()) return setFormError('Name is required.')
    setFormError('')
    save.mutate(
      { featureType, name: name.trim(), amount: Number(amount) || 0, status },
      {
        onSuccess: () => {
          setShowForm(false)
          setName('')
          setAmount('0')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  return (
    <Card className="!h-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Room Features / Amenities</h3>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
          + Add
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-lg border border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={featureType} onChange={(e) => setFeatureType(e.target.value as typeof featureType)} className={fieldCls}>
              <option value="complementary">Complementary</option>
              <option value="facility">Facility</option>
              <option value="amenities">Amenities</option>
            </select>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={fieldCls} />
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className={fieldCls} />
            <select value={status} onChange={(e) => setStatus(Number(e.target.value) as 1 | 2)} className={fieldCls}>
              <option value={1}>Active</option>
              <option value={2}>Inactive</option>
            </select>
          </div>
          {formError && <p className="text-xs text-danger mt-2">{formError}</p>}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={save.isPending}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {save.isPending && <LoaderCircle size={12} className="animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-text-faint py-2">Loading…</p>
      ) : !features || features.length === 0 ? (
        <p className="text-sm text-text-faint italic py-6 text-center">None yet — add one.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([type, items]) => (
            <div key={type}>
              <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-1.5">{FEATURE_TYPE_LABEL[type] ?? type}</p>
              <div className="divide-y divide-border">
                {(items ?? []).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-text!">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">{f.amount ? `K${Number(f.amount).toLocaleString()}` : 'Free'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                        {f.status === 1 ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        disabled={!token}
                        onClick={() => token && confirm(`Delete "${f.name}"?`) && del.mutate({ id: f.id, token })}
                        className="p-1.5 rounded-md text-danger hover:bg-surface-hover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function IntegrationsCard() {
  const rows = [
    { icon: Receipt, name: 'ZRA Smart Invoice', meta: 'VSDC · online', tag: 'Connected' },
    { icon: Smartphone, name: 'Airtel Money · MTN MoMo', meta: 'Mobile money collections', tag: 'Connected' },
    { icon: CoinsIcon, name: 'Twin currency · 3-tier tax', meta: 'ZMW/USD · VAT + Tourism + Service', tag: 'Active' },
  ]
  return (
    <Card className="!h-auto">
      <h3 className="font-semibold text-text! mb-3">Integrations</h3>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 py-2.5">
            <span className="shrink-0 w-9 h-9 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <r.icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text!">{r.name}</p>
              <p className="text-xs text-text-faint">{r.meta}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-fg">{r.tag}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function PaymentsCard() {
  const { data: token } = useHotelToken()
  const { data: cfg } = useHotelPayCfg()
  const save = useHotelSavePayAcct()
  const [account, setAccount] = useState('')

  return (
    <Card className="!h-auto">
      <h3 className="font-semibold text-text! mb-3">Payments</h3>
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Default bank account</span>
          <select value={account || String(cfg?.selected ?? '')} onChange={(e) => setAccount(e.target.value)} className={`min-w-[220px] ${fieldCls}`}>
            {(cfg?.banks ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!token || !account || save.isPending}
          onClick={() => token && account && save.mutate({ account, token })}
          className="text-xs text-white bg-brand rounded-md px-3 py-2 disabled:opacity-50"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-text-faint mt-2">Collect / Record / Apply payments post the bank entry into this account.</p>
    </Card>
  )
}

export function HotelSettings() {
  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TypeSection kind="floor" label="Floors" />
        <TypeSection kind="roomtype" label="Room Types" />
        <TypeSection kind="bed" label="Bed Types" />
        <TypeSection kind="booking" label="Booking Types" />
      </div>

      <RoomsSection />
      <FeaturesSection />
      <IntegrationsCard />
      <PaymentsCard />
    </div>
  )
}
