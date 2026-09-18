import { useMemo, useState } from 'react'
import { UtensilsCrossed, LoaderCircle, Check, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  useHotelRsOrders,
  useHotelRsRooms,
  useHotelPosMenu,
  useHotelPostOrder,
  useHotelOrderStatus,
  useHotelConfirmOrder,
  useHotelRejectOrder,
  useHotelToken,
} from '../hotel.queries'

const STATUS_TAG: Record<string, string> = {
  pending: 'bg-warning-bg text-warning-fg',
  preparing: 'bg-info-bg text-info-fg',
  ready: 'bg-success-bg text-success-fg',
  delivered: 'bg-neutral-bg text-neutral-fg',
  rejected: 'bg-neutral-bg text-neutral-fg',
}

// Real via custom/hotel/api.php?r=rsorders|rsrooms|posmenu, plus
// a=postorder / a=orderstatus / a=confirmorder / a=rejectorder — the Hotel
// Suite app's own Room Service (Guest Orders + Post Order to Room). The
// "N new" badge and "Kitchen screen" link (custom/hotel/kitchen.php, opens
// in a new tab) and "Charge F&B to a folio" label are all confirmed live
// by reading the Suite's own JS/HTML directly — the badge is genuinely
// just a client-side count of orders.data with status==='pending', and
// "Charge F&B to a folio" is static descriptive text, not a clickable
// action.
export function HotelRoomService() {
  const { data: token } = useHotelToken()
  const orders = useHotelRsOrders()
  const { data: rsRooms } = useHotelRsRooms()
  const { data: menu } = useHotelPosMenu()
  const postOrder = useHotelPostOrder()
  const orderStatus = useHotelOrderStatus()
  const confirmOrder = useHotelConfirmOrder()
  const rejectOrder = useHotelRejectOrder()

  const [room, setRoom] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase()
    const items = menu ?? []
    return q ? items.filter((m) => m.name.toLowerCase().includes(q)) : items
  }, [menu, search])

  const groupedMenu = useMemo(() => {
    const groups = new Map<string, typeof filteredMenu>()
    for (const m of filteredMenu.slice(0, 60)) {
      if (!groups.has(m.category)) groups.set(m.category, [])
      groups.get(m.category)!.push(m)
    }
    return groups
  }, [filteredMenu])

  const total = useMemo(() => {
    let t = 0
    for (const m of menu ?? []) t += (cart[m.id] ?? 0) * Number(m.price)
    return t
  }, [cart, menu])

  function adjustQty(id: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      return { ...prev, [id]: next }
    })
  }

  function handlePost() {
    if (!token || !room) return
    const [booking, roomno] = room.split('|')
    const lines = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(',')
    if (!lines) return
    postOrder.mutate({ booking, roomno: roomno ?? '', lines, token }, { onSuccess: () => setCart({}) })
  }

  function handleStatus(id: string, status: string) {
    if (!token) return
    setBusyId(id)
    orderStatus.mutate({ id, status, token }, { onSettled: () => setBusyId(null) })
  }
  function handleConfirm(id: string) {
    if (!token) return
    setBusyId(id)
    confirmOrder.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }
  function handleReject(id: string) {
    if (!token || !confirm('Reject this order?')) return
    setBusyId(id)
    rejectOrder.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const pendingCount = (orders.data ?? []).filter((o) => o.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <UtensilsCrossed size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Room Service</h2>
          <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">Guest orders &amp; F&amp;B</p>
        </div>
      </div>

      <Card className="!h-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text!">Guest Orders</h3>
            <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">{pendingCount} new</span>
          </div>
          <a
            href="/custom/hotel/kitchen.php"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
          >
            <UtensilsCrossed size={12} /> Kitchen screen ↗
          </a>
        </div>
        {orders.isLoading && <LegacyLoadingCard label="Loading orders…" />}
        {orders.isError && <LegacyErrorCard title="Couldn't load orders" message={orders.error instanceof Error ? orders.error.message : 'Unknown error.'} onRetry={() => orders.refetch()} />}
        {orders.data && orders.data.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No orders yet — guests order via the in-room QR.</p>
        ) : (
          <div className="divide-y divide-border">
            {(orders.data ?? []).map((o) => (
              <div key={o.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text!">
                    Room {o.room_number} · {o.guest_name || 'Guest'} <span className="text-xs text-text-faint">{o.source === 'guest' ? 'app' : 'staff'} · {o.created}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')} · <span className="font-medium">K{Number(o.total).toLocaleString()}</span>
                  </p>
                  {o.notes && <p className="text-xs text-text-faint mt-0.5">{o.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[o.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{o.status}</span>
                  <div className="flex gap-1.5">
                    {o.status === 'pending' && (
                      <>
                        <button type="button" disabled={!token || busyId === o.id} onClick={() => handleConfirm(o.id)} title="Accept" className="p-1.5 rounded-md text-success-fg hover:bg-surface-hover">
                          <Check size={14} />
                        </button>
                        <button type="button" disabled={!token || busyId === o.id} onClick={() => handleReject(o.id)} title="Reject" className="p-1.5 rounded-md text-danger hover:bg-surface-hover">
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {o.status === 'preparing' && (
                      <button type="button" disabled={!token || busyId === o.id} onClick={() => handleStatus(o.id, 'ready')} className="text-xs text-brand hover:underline">
                        Mark ready
                      </button>
                    )}
                    {o.status === 'ready' && (
                      <button type="button" disabled={!token || busyId === o.id} onClick={() => handleStatus(o.id, 'delivered')} className="text-xs text-brand hover:underline">
                        Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="!h-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-text!">Post Order to Room</h3>
          <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">Charge F&amp;B to a folio</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-text-faint">Room</span>
          <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-9 min-w-[220px] px-3 rounded-md border border-input-border bg-input-bg text-text text-sm">
            <option value="">{(rsRooms ?? []).length === 0 ? 'No in-house guests' : 'Select room…'}</option>
            {(rsRooms ?? []).map((r) => (
              <option key={r.num} value={`${r.num}|${r.room}`}>
                Room {r.room} · {r.guest || 'Guest'}
              </option>
            ))}
          </select>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          className="w-full h-9 px-3 mb-3 rounded-md border border-input-border bg-input-bg text-text text-sm"
        />
        {menu && menu.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No menu items configured.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-auto">
            {Array.from(groupedMenu.entries()).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs uppercase tracking-wide text-text-faint mb-2">
                  {category} ({items.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((m) => {
                    const qty = cart[m.id] ?? 0
                    return (
                      <div key={m.id} className={`rounded-lg border p-2.5 ${qty > 0 ? 'border-brand bg-brand/5' : 'border-border'}`}>
                        <p className="text-sm font-medium text-text! line-clamp-2 mb-2">{m.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-brand font-semibold">K{Number(m.price).toLocaleString()}</span>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => adjustQty(m.id, -1)} className="w-6 h-6 rounded-full border border-border text-xs">
                              -
                            </button>
                            <span className="text-sm w-4 text-center">{qty}</span>
                            <button type="button" onClick={() => adjustQty(m.id, 1)} className="w-6 h-6 rounded-full border border-brand bg-brand/10 text-xs">
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-lg font-bold text-text!">Total: K{total.toLocaleString()}</span>
          <button
            type="button"
            disabled={!token || !room || cartCount === 0 || postOrder.isPending}
            onClick={handlePost}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {postOrder.isPending && <LoaderCircle size={14} className="animate-spin" />} Post to folio
          </button>
        </div>
      </Card>
    </div>
  )
}
