import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useHotelPayCfg, useHotelSavePayAcct, useHotelToken } from '../hotel.queries'

const fieldCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm'

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

// Real via custom/hotel/api.php?r=paycfg, plus a=savepayacct. Room Types,
// Floors, Booking Types, Bed Types and Room Features each have their own
// dedicated page now (see hotel.nav.ts's own Room Settings group), and
// Rooms moved to its own Room List page (HotelRoomListPage.tsx) — this page
// is left holding only what has no dedicated page of its own yet.
export function HotelSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <Settings size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Hotel Settings</h2>
          <p className="text-xs text-text-faint mt-0.5">Room Types, Floors, Booking Types, Bed Types, Room Features and Room List now each have their own page.</p>
        </div>
      </div>

      <PaymentsCard />
    </div>
  )
}
