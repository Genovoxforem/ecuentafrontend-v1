import { useState } from 'react'
import { X, LoaderCircle, CircleCheck, Circle, LogOut, ReceiptText, DoorOpen } from 'lucide-react'
import {
  useHotelFolio,
  useHotelFolioPay,
  useHotelGenerateInvoice,
  useHotelFinalizeInvoice,
  useHotelRecordPayment,
  useHotelApplyCollected,
  useHotelCheckOut,
  useHotelRoomCharges,
  useHotelAddCharge,
  useHotelVoidCharge,
  useHotelPosCatalog,
  useHotelBookingRooms,
  useHotelAddBookingRoom,
  useHotelRemoveBookingRoom,
  useHotelAvailable,
  useHotelToken,
} from '../hotel.queries'

const btn = 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50'
const fieldCls = 'h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-xs outline-none focus:ring-2 focus:ring-brand/30'

function Step({ ok, title, sub, action }: { ok: boolean; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      {ok ? <CircleCheck size={18} className="text-success-fg shrink-0" /> : <Circle size={18} className="text-text-faint shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text!">{title}</p>
        <p className="text-xs text-text-faint">{sub}</p>
      </div>
      {!ok && action}
    </div>
  )
}

// Reproduces the real checkoutModal() from custom/hotel/app.php (read
// directly, not guessed): checkout is gated behind 4 real steps — invoice
// generated (a=invoice), finalized/ZRA (a=validateinvoice), collected
// payments applied (a=applycollected, itself fed by a=recordpayment) — the
// exact same `ready = !early && hasInv && fin && unapp<=0.01` gate the real
// modal computes. HotelFrontDesk.tsx's own "simple contract" checkout
// (a=checkout with force) still exists as the emergency override at the
// bottom, same as the real modal's own force-anyway path via a confirm().
//
// Caveat: every one of this wizard's writes (invoice/validateinvoice/
// recordpayment/applycollected, and the charge/room panels below) is wired
// against contracts read directly from that real JS, but this backend
// currently has zero rooms and zero bookings (confirmed live — nothing
// exists for any of these to act on yet), so none of them could be
// exercised end-to-end the way a=savesuite's own live test caught a
// genuine "table doesn't exist" bug elsewhere on this backend (see
// HotelRoomTypesPage.tsx). Re-verify each step live once a real booking
// exists to check out.
export function HotelCheckoutWizard({ booking, guest, onClose, onDone }: { booking: string; guest: string; onClose: () => void; onDone: () => void }) {
  const { data: token } = useHotelToken()
  const { data: folio, refetch: refetchFolio } = useHotelFolio(booking)
  const { data: pay, refetch: refetchPay } = useHotelFolioPay(booking)
  const genInvoice = useHotelGenerateInvoice()
  const finalize = useHotelFinalizeInvoice()
  const recordPay = useHotelRecordPayment()
  const applyCollected = useHotelApplyCollected()
  const checkOut = useHotelCheckOut()

  const [showCharge, setShowCharge] = useState(false)
  const [showRooms, setShowRooms] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('cash')
  const [payRef, setPayRef] = useState('')

  function refreshAll() {
    refetchFolio()
    refetchPay()
  }

  const hasInv = Number(pay?.invoice_id ?? 0) > 0
  const fin = Number(pay?.inv_validated ?? 0) === 1
  const unapplied = Number(pay?.unapplied ?? 0)
  const collected = Number(pay?.collected ?? 0)
  const early = Number(pay?.early ?? 0) === 1
  const ready = !early && hasInv && fin && unapplied <= 0.01
  const balance = folio && !folio.error ? Number(folio.balance) : 0
  const total = folio && !folio.error ? Number(folio.total) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-text!">Check out · {guest || 'Guest'}</h3>
            <p className="text-xs text-text-faint">Booking {booking}</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2 border-b border-border">
          <button type="button" onClick={() => setShowCharge((v) => !v)} className="rounded-md border border-input-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover">
            <ReceiptText size={12} className="inline -mt-0.5 mr-1" /> Charge to room
          </button>
          <button type="button" onClick={() => setShowRooms((v) => !v)} className="rounded-md border border-input-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover">
            <DoorOpen size={12} className="inline -mt-0.5 mr-1" /> Edit rooms
          </button>
        </div>

        {showCharge && <RoomChargePanel booking={booking} token={token} onChanged={refreshAll} />}
        {showRooms && <EditRoomsPanel booking={booking} token={token} onChanged={refreshAll} />}

        <div className="px-5 py-3">
          {early && (
            <p className="text-xs text-warning-fg bg-warning-bg rounded-md px-3 py-2 mb-2">
              Early checkout — booked {pay?.booked_nights ?? '?'} night(s) until {pay?.booked_co ?? '—'}, actual stay is {pay?.actual_nights ?? '?'} night(s). The real Suite re-bills the
              shortened stay here; that specific action isn't wired in this app yet, so resolve the nights manually before finalizing.
            </p>
          )}

          <Step
            ok={hasInv}
            title="Invoice generated"
            sub={hasInv ? `Ref ${pay?.inv_ref ?? ''}` : 'No invoice yet'}
            action={
              <button
                type="button"
                disabled={!token || genInvoice.isPending}
                onClick={() => token && genInvoice.mutate({ booking, token }, { onSuccess: refreshAll })}
                className={`${btn} bg-brand text-white hover:bg-brand-hover`}
              >
                {genInvoice.isPending && <LoaderCircle size={12} className="animate-spin" />} Generate
              </button>
            }
          />
          <Step
            ok={fin}
            title="Finalized (ZRA)"
            sub={fin ? 'Fiscalized' : 'Validate & fiscalize the invoice'}
            action={
              <button
                type="button"
                disabled={!token || !hasInv || finalize.isPending}
                onClick={() => {
                  if (token && confirm(`Finalize invoice for ${booking}? This VALIDATES and fiscalizes it via ZRA and cannot be undone.`)) {
                    finalize.mutate({ booking, token }, { onSuccess: refreshAll })
                  }
                }}
                className={`${btn} bg-brand text-white hover:bg-brand-hover`}
              >
                {finalize.isPending && <LoaderCircle size={12} className="animate-spin" />} Finalize (ZRA)
              </button>
            }
          />
          <Step
            ok={unapplied <= 0.01}
            title="Collected payments applied"
            sub={collected <= 0 ? 'No payments collected' : unapplied <= 0.01 ? `K${collected.toLocaleString()} on invoice` : `K${unapplied.toLocaleString()} collected, not on invoice yet`}
            action={
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setShowPay((v) => !v)} className={`${btn} border border-input-border text-text-muted hover:bg-surface-hover`}>
                  Record payment
                </button>
                <button
                  type="button"
                  disabled={!token || !fin || unapplied <= 0.01 || applyCollected.isPending}
                  onClick={() => {
                    if (token && confirm('Apply all collected payments to this booking invoice?\n\nThe invoice must be finalized first.')) {
                      applyCollected.mutate({ booking, token }, { onSuccess: refreshAll })
                    }
                  }}
                  className={`${btn} bg-brand text-white hover:bg-brand-hover`}
                >
                  {applyCollected.isPending && <LoaderCircle size={12} className="animate-spin" />} Apply
                </button>
              </div>
            }
          />

          {showPay && (
            <div className="mt-2 mb-3 p-3 rounded-lg border border-border bg-surface-alt space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount (K)" className={fieldCls} />
                <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={fieldCls}>
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile money</option>
                  <option value="card">Card</option>
                  <option value="transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Reference (optional)" className={`w-full ${fieldCls}`} />
              <button
                type="button"
                disabled={!token || !payAmount || recordPay.isPending}
                onClick={() => {
                  if (!token) return
                  recordPay.mutate(
                    { booking, amount: Number(payAmount), mode: payMode, ref: payRef, token },
                    {
                      onSuccess: () => {
                        setShowPay(false)
                        setPayAmount('')
                        setPayRef('')
                        refreshAll()
                      },
                    },
                  )
                }}
                className={`${btn} w-full justify-center bg-brand text-white hover:bg-brand-hover`}
              >
                {recordPay.isPending && <LoaderCircle size={12} className="animate-spin" />} Record payment
              </button>
              {recordPay.isError && <p className="text-xs text-danger-fg">{recordPay.error instanceof Error ? recordPay.error.message : 'Failed.'}</p>}
            </div>
          )}

          <div className="border-t border-border pt-3 mt-1 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Invoice total</span>
              <span className="text-text!">K{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Collected</span>
              <span className="text-text!">K{collected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-text!">Balance due</span>
              <span className="text-text!">K{balance.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!token || !ready || checkOut.isPending}
            onClick={() => token && checkOut.mutate({ booking, token }, { onSuccess: onDone })}
            className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {checkOut.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <LogOut size={14} />} {ready ? 'Check out' : 'Complete the steps to check out'}
          </button>
          {!ready && (
            <button
              type="button"
              disabled={!token || checkOut.isPending}
              onClick={() => {
                if (token && confirm(`Force check out ${booking} without completing the above steps?`)) {
                  checkOut.mutate({ booking, force: true, token }, { onSuccess: onDone })
                }
              }}
              className="w-full mt-1.5 text-xs text-danger-fg hover:underline"
            >
              Force check out anyway
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RoomChargePanel({ booking, token, onChanged }: { booking: string; token: string | undefined; onChanged: () => void }) {
  const { data: charges, refetch } = useHotelRoomCharges(booking)
  const addCharge = useHotelAddCharge()
  const voidCharge = useHotelVoidCharge()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('restaurant')
  const [qty, setQty] = useState('1')
  const [label, setLabel] = useState('')
  const [price, setPrice] = useState('')
  const { data: results } = useHotelPosCatalog(q)

  function afterAdd() {
    setQ('')
    setLabel('')
    setPrice('')
    refetch()
    onChanged()
  }

  return (
    <div className="px-5 py-3 border-b border-border bg-surface-alt/50 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>
          <option value="restaurant">Restaurant</option>
          <option value="bar">Bar</option>
          <option value="minibar">Minibar</option>
          <option value="laundry">Laundry</option>
          <option value="spa">Spa</option>
          <option value="misc">Misc</option>
        </select>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" className={fieldCls} />
      </div>
      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search POS items…" className={`w-full ${fieldCls}`} />
        {q.trim() && results && results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
            {results.map((it) => (
              <button
                key={it.id}
                type="button"
                onMouseDown={() =>
                  token && addCharge.mutate({ booking, product: it.id, category, qty: Number(qty) || 1, token }, { onSuccess: afterAdd })
                }
                className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-surface-hover"
              >
                <span>{it.label}</span>
                <span className="text-text-faint">K{Number(it.price).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[11px] text-text-faint">— or add a free item —</p>
      <div className="grid grid-cols-[2fr_1fr_auto] gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Item name" className={fieldCls} />
        <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className={fieldCls} />
        <button
          type="button"
          disabled={!token || !label || addCharge.isPending}
          onClick={() => token && addCharge.mutate({ booking, label, unitPrice: Number(price) || 0, category, qty: Number(qty) || 1, token }, { onSuccess: afterAdd })}
          className={`${btn} bg-brand text-white hover:bg-brand-hover`}
        >
          Add
        </button>
      </div>

      <div className="pt-1">
        {(charges ?? []).length === 0 ? (
          <p className="text-xs text-text-faint py-1">No charges yet.</p>
        ) : (
          (charges ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-1 text-xs">
              <span className="text-text-muted">
                {c.category && <b className="capitalize">{c.category}</b>} {c.label} {c.qty !== 1 ? `×${c.qty}` : ''}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-text!">K{Number(c.amt).toLocaleString()}</span>
                <button
                  type="button"
                  disabled={!token || voidCharge.isPending}
                  onClick={() => token && voidCharge.mutate({ id: c.id, booking, token }, { onSuccess: () => (refetch(), onChanged()) })}
                  className="text-danger-fg hover:underline"
                >
                  void
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EditRoomsPanel({ booking, token, onChanged }: { booking: string; token: string | undefined; onChanged: () => void }) {
  const { data: rooms, refetch } = useHotelBookingRooms(booking)
  const today = new Date().toISOString().slice(0, 10)
  const { data: available } = useHotelAvailable(today, today)
  const addRoom = useHotelAddBookingRoom()
  const removeRoom = useHotelRemoveBookingRoom()

  return (
    <div className="px-5 py-3 border-b border-border bg-surface-alt/50 space-y-2">
      <p className="text-xs font-medium text-text-muted">Current suites</p>
      {(rooms ?? []).length === 0 ? (
        <p className="text-xs text-text-faint">None</p>
      ) : (
        (rooms ?? []).map((r) => (
          <div key={r.brid} className="flex items-center justify-between text-xs py-1">
            <span>
              {r.no} <span className="text-text-faint">K{Number(r.rate).toLocaleString()}</span>
            </span>
            <button
              type="button"
              disabled={!token || removeRoom.isPending}
              onClick={() => {
                if (token && confirm('Remove this suite from the booking?')) {
                  removeRoom.mutate({ booking, brid: r.brid, token }, { onSuccess: () => (refetch(), onChanged()) })
                }
              }}
              className="text-danger-fg hover:underline"
            >
              remove
            </button>
          </div>
        ))
      )}
      <p className="text-xs font-medium text-text-muted mt-2">Add a suite</p>
      <div className="flex flex-wrap gap-1.5">
        {(available ?? []).length === 0 ? (
          <p className="text-xs text-text-faint">No free suites</p>
        ) : (
          (available ?? []).slice(0, 14).map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={!token || addRoom.isPending}
              onClick={() => token && addRoom.mutate({ booking, room: r.id, token }, { onSuccess: () => (refetch(), onChanged()) })}
              title={`K${Number(r.rate).toLocaleString()}`}
              className="rounded-md border border-input-border px-2 py-1 text-xs text-text-muted hover:bg-surface-hover"
            >
              {r.no}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
