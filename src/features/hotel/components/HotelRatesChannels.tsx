import { useState } from 'react'
import { Globe2, LoaderCircle, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useHotelRatePlans,
  useHotelSaveRate,
  useHotelChannels,
  useHotelSaveChannel,
  useHotelDelChannel,
  useHotelSyncChannel,
  useHotelToken,
  type HotelChannel,
  type HotelRatePlanRow,
} from '../hotel.queries'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm'

function priceForLevel(row: HotelRatePlanRow, level: number): number {
  switch (level) {
    case 1:
      return row.p1 ?? 0
    case 2:
      return row.p2 ?? 0
    case 3:
      return row.p3 ?? 0
    case 4:
      return row.p4 ?? 0
    case 5:
      return row.p5 ?? 0
    default:
      return 0
  }
}

function RateCell({ pid, level, value, token }: { pid: number; level: number; value: number; token: string | undefined }) {
  const save = useHotelSaveRate()
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(value))

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-20 h-7 px-1.5 rounded-md border border-input-border bg-input-bg text-text text-sm"
        />
        <button
          type="button"
          disabled={!token || save.isPending}
          onClick={() => token && save.mutate({ pid, level, price: Number(price) || 0, token }, { onSuccess: () => setEditing(false) })}
          className="text-xs text-brand"
        >
          {save.isPending ? <LoaderCircle size={11} className="animate-spin" /> : '✓'}
        </button>
      </div>
    )
  }
  return (
    <button type="button" onClick={() => setEditing(true)} title="Click to update this rate" className="font-semibold text-brand hover:underline">
      K{value.toLocaleString()}
    </button>
  )
}

function ChannelModal({ channel, onClose, onSaved }: { channel: HotelChannel | null; onClose: () => void; onSaved: () => void }) {
  const { data: token } = useHotelToken()
  const save = useHotelSaveChannel()
  const [name, setName] = useState(channel?.name ?? '')
  const [type, setType] = useState(channel?.type ?? 'bookingcom')
  const [propertyId, setPropertyId] = useState(channel?.property_id ?? '')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [enabled, setEnabled] = useState<0 | 1>(channel?.enabled ?? 1)
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) return setError('Channel name required.')
    if (!token) return
    save.mutate(
      { id: channel?.id, name, type, property_id: propertyId, api_key: apiKey, api_secret: apiSecret, enabled, token },
      { onSuccess: onSaved, onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text!">{channel ? 'Edit channel' : 'Add OTA channel'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" className={`w-full ${fieldCls}`} />
          <select value={type} onChange={(e) => setType(e.target.value)} className={`w-full ${fieldCls}`}>
            <option value="bookingcom">Booking.com</option>
            <option value="expedia">Expedia</option>
            <option value="airbnb">Airbnb</option>
            <option value="agoda">Agoda</option>
            <option value="other">Other</option>
          </select>
          <input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Property / hotel ID" className={`w-full ${fieldCls}`} />
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={channel?.has_key ? 'API key (set — blank keeps current)' : 'API key'} className={`w-full ${fieldCls}`} />
          <input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="API secret (optional)" className={`w-full ${fieldCls}`} />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={enabled === 1} onChange={(e) => setEnabled(e.target.checked ? 1 : 0)} /> Enabled
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <p className="text-xs text-text-faint">Live rate/availability push activates once the OTA connectivity API is wired with these credentials.</p>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={!token || save.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {save.isPending && <LoaderCircle size={13} className="animate-spin" />} Save channel
          </button>
        </div>
      </div>
    </div>
  )
}

// Real via custom/hotel/api.php?r=rateplans|channels, plus a=saverate /
// a=savechannel / a=delchannel — the Hotel Suite app's own Rates &
// Channels view.
export function HotelRatesChannels() {
  const { data: token } = useHotelToken()
  const { data: ratePlans, isLoading, isError, error, refetch } = useHotelRatePlans()
  const { data: channels } = useHotelChannels()
  const delChannel = useHotelDelChannel()
  const syncChannel = useHotelSyncChannel()
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ channel: HotelChannel | null } | null>(null)

  return (
    <div className="space-y-4">

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-1">Rate Plans</h3>
        <p className="text-xs text-text-faint mb-3">Dolibarr price levels — tap a rate to edit</p>
        {isLoading && <LegacyLoadingCard label="Loading rate plans…" />}
        {isError && <LegacyErrorCard title="Couldn't load rate plans" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
        {ratePlans && ratePlans.plans.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No booking types defined — add one in Settings first.</p>
        ) : (
          ratePlans && (
            <div className="overflow-auto no-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-2 py-2">Room type</th>
                    {ratePlans.plans.map((p) => (
                      <th key={p.level} className="font-medium px-2 py-2">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ratePlans.rows.map((r) => (
                    <tr key={r.ty} className="border-b border-border last:border-0">
                      <td className="px-2 py-2 text-text! font-medium">{r.type}</td>
                      {ratePlans.plans.map((p) => (
                        <td key={p.level} className="px-2 py-2">
                          <RateCell pid={r.pid} level={p.level} value={priceForLevel(r, p.level)} token={token} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      <Card className="!h-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text!">Distribution Channels</h3>
          <button type="button" onClick={() => setModal({ channel: null })} className="text-xs font-medium text-white bg-brand rounded-md px-2.5 py-1.5 hover:bg-brand-hover">
            + Add OTA
          </button>
        </div>
        <div className="flex items-center gap-3 py-2.5 border-b border-border mb-2">
          <span className="shrink-0 w-9 h-9 rounded-lg bg-brand/10 text-brand grid place-items-center">
            <Globe2 size={16} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-text!">Booking Engine (website)</p>
            <p className="text-xs text-text-faint">Live · guest-facing · card / mobile money</p>
          </div>
          <a href="/custom/hotel/public/index.php" target="_blank" rel="noopener" className="text-xs text-brand hover:underline">
            Open site
          </a>
        </div>
        {channels && channels.length === 0 ? (
          <p className="text-sm text-text-faint italic py-2">No OTA channels yet. Add Booking.com, Expedia, etc.</p>
        ) : (
          <div className="divide-y divide-border">
            {(channels ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text!">{c.name}</p>
                  <p className="text-xs text-text-faint">
                    {c.type}
                    {c.property_id ? ` · ${c.property_id}` : ''}
                    {c.last_sync ? ` · synced ${c.last_sync}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.enabled !== 1 ? 'bg-neutral-bg text-neutral-fg' : c.has_key === 1 ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                  {c.enabled !== 1 ? 'Off' : c.has_key === 1 ? c.sync_status || 'ready' : 'No API key'}
                </span>
                <button type="button" onClick={() => setModal({ channel: c })} className="text-xs text-text-muted hover:underline">
                  {c.has_key === 1 ? 'Configure' : 'Connect'}
                </button>
                {c.has_key === 1 && (
                  <button
                    type="button"
                    disabled={!token || syncingId === c.id}
                    onClick={() => {
                      if (!token) return
                      setSyncingId(c.id)
                      syncChannel.mutate({ id: c.id, token }, { onSettled: () => setSyncingId(null) })
                    }}
                    className="flex items-center gap-1 text-xs text-brand hover:underline disabled:opacity-50"
                  >
                    {syncingId === c.id ? <LoaderCircle size={11} className="animate-spin" /> : null} Sync
                  </button>
                )}
                <button
                  type="button"
                  disabled={!token}
                  onClick={() => token && confirm('Remove this channel?') && delChannel.mutate({ id: c.id, token })}
                  className="text-xs text-danger hover:underline"
                >
                  Del
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && <ChannelModal channel={modal.channel} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
    </div>
  )
}
