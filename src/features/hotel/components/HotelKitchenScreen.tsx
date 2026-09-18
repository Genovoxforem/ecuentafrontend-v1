import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Utensils, Check, X, ArrowLeft } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelRsOrders, useHotelConfirmOrder, useHotelRejectOrder, useHotelOrderStatus, useHotelToken, type HotelRsOrder } from '../hotel.queries'
import { ROUTES } from '../../../routes'

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.55)
  } catch {
    // Best-effort chime — silent no-op if the browser blocks/lacks Web Audio.
  }
}

function OrderRow({ order, children }: { order: HotelRsOrder; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-sm font-semibold text-text!">Room {order.room_number || '—'}</p>
      <p className="text-xs text-text-faint mb-1.5">
        {order.guest_name || 'Guest'} · {order.source === 'guest' ? 'app order' : 'staff'}
      </p>
      <ul className="space-y-0.5 mb-1.5">
        {order.items.map((i, idx) => (
          <li key={idx} className="text-sm text-text-muted">
            <b className="text-text! font-medium">{i.qty}×</b> {i.name}
          </li>
        ))}
      </ul>
      {order.notes && <p className="text-xs italic text-text-faint mb-1.5">&ldquo;{order.notes}&rdquo;</p>}
      <p className="text-[11px] text-text-faint mb-2">{order.created}</p>
      {children}
    </div>
  )
}

// Real via custom/hotel/api.php?r=rsorders, plus a=confirmorder /
// a=rejectorder / a=orderstatus — the same endpoints HotelRoomService.tsx
// already uses. This is a React rebuild of the real Suite's own
// custom/hotel/kitchen.php kiosk board (confirmed live by reading that
// page's own JS directly: it's the exact same 3-column New/Cooking/Ready
// split over the same rsorders array, filtered client-side by status, with
// the same accept/reject/mark-ready/delivered actions and an 8s poll +
// beep-on-new-order), restyled with this app's own Card/design system
// (the real page's page is a standalone dark kiosk board — this one lives
// inside the Suite shell like every other page here, e.g. the Dashboard
// reached via the classic "Room Status" menu item). The "Kitchen screen ↗"
// button in Room Service used to link straight to that PHP file; it now
// opens this route instead.
export function HotelKitchenScreen() {
  const { data: token } = useHotelToken()
  const orders = useHotelRsOrders(8000)
  const confirmOrder = useHotelConfirmOrder()
  const rejectOrder = useHotelRejectOrder()
  const orderStatus = useHotelOrderStatus()
  const [busyId, setBusyId] = useState<string | null>(null)
  const seenRef = useRef(-1)

  const all = orders.data ?? []
  const fresh = all.filter((o) => o.status === 'pending')
  const cooking = all.filter((o) => o.status === 'preparing')
  const ready = all.filter((o) => o.status === 'ready')

  useEffect(() => {
    if (!orders.data) return
    if (seenRef.current >= 0 && fresh.length > seenRef.current) beep()
    seenRef.current = fresh.length
    // Only the pending count should trigger the chime, matching the real
    // board's own SEEN-count comparison — not every orders.data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.data, fresh.length])

  function accept(id: string) {
    if (!token) return
    setBusyId(id)
    confirmOrder.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }
  function reject(id: string) {
    if (!token) return
    setBusyId(id)
    rejectOrder.mutate({ id, token }, { onSettled: () => setBusyId(null) })
  }
  function setStatus(id: string, status: string) {
    if (!token) return
    setBusyId(id)
    orderStatus.mutate({ id, status, token }, { onSettled: () => setBusyId(null) })
  }

  return (
    <div className="min-h-screen bg-surface p-6 space-y-4">
      <Link to={ROUTES.hotelRoomService} className="inline-flex items-center gap-1 text-xs text-text-faint hover:text-text!">
        <ArrowLeft size={13} /> Room Service
      </Link>

      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <Utensils size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Kitchen &amp; Bar</h2>
          <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">{orders.isError ? "Couldn't load orders" : 'Live order board · auto-refresh'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="!h-auto">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-text!">New Orders</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg">{fresh.length}</span>
          </div>
          {fresh.length === 0 ? (
            <p className="text-sm text-text-faint italic py-4 text-center">No new orders</p>
          ) : (
            <div className="space-y-2.5">
              {fresh.map((o) => (
                <OrderRow key={o.id} order={o}>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={!token || busyId === o.id}
                      onClick={() => accept(o.id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                    >
                      <Check size={12} /> Accept &amp; cook
                    </button>
                    <button
                      type="button"
                      disabled={!token || busyId === o.id}
                      onClick={() => reject(o.id)}
                      className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-danger hover:bg-surface-hover disabled:opacity-50"
                    >
                      <X size={12} /> Reject
                    </button>
                  </div>
                </OrderRow>
              ))}
            </div>
          )}
        </Card>

        <Card className="!h-auto">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-text!">Cooking</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-info-bg text-info-fg">{cooking.length}</span>
          </div>
          {cooking.length === 0 ? (
            <p className="text-sm text-text-faint italic py-4 text-center">Nothing cooking</p>
          ) : (
            <div className="space-y-2.5">
              {cooking.map((o) => (
                <OrderRow key={o.id} order={o}>
                  <button
                    type="button"
                    disabled={!token || busyId === o.id}
                    onClick={() => setStatus(o.id, 'ready')}
                    className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    Mark ready
                  </button>
                </OrderRow>
              ))}
            </div>
          )}
        </Card>

        <Card className="!h-auto">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-text!">Ready to Deliver</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success-fg">{ready.length}</span>
          </div>
          {ready.length === 0 ? (
            <p className="text-sm text-text-faint italic py-4 text-center">Nothing waiting</p>
          ) : (
            <div className="space-y-2.5">
              {ready.map((o) => (
                <OrderRow key={o.id} order={o}>
                  <button
                    type="button"
                    disabled={!token || busyId === o.id}
                    onClick={() => setStatus(o.id, 'delivered')}
                    className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    Delivered
                  </button>
                </OrderRow>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
