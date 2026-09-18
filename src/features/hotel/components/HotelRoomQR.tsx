import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Printer } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelRoomQr } from '../hotel.queries'

function RoomQrCard({ no, type }: { no: string; type: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const orderUrl = `${window.location.origin}/custom/hotel/public/order.php?room=${encodeURIComponent(no)}`

  useEffect(() => {
    QRCode.toDataURL(orderUrl, { width: 140, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(''))
  }, [orderUrl])

  return (
    <div className="border border-border rounded-xl p-3.5 text-center w-44 bg-surface">
      <p className="font-semibold text-text!">Room {no}</p>
      <p className="text-xs text-text-faint mb-2">{type}</p>
      <div className="min-h-[140px] flex items-center justify-center">{dataUrl ? <img src={dataUrl} width={140} height={140} alt={`QR for room ${no}`} /> : <span className="text-xs text-text-faint">Generating…</span>}</div>
      <p className="text-[10px] text-text-faint mt-2 break-all">order.php?room={no}</p>
    </div>
  )
}

// Real via custom/hotel/api.php?r=roomqr — the Hotel Suite app's own Room
// QR Codes view. Each code points to the real in-room ordering page
// (custom/hotel/public/order.php?room=<no>), generated client-side with
// the qrcode package already vendored in this app rather than the
// original's own bundled QRCode.js.
export function HotelRoomQR() {
  const { data: rooms, isLoading, isError, error, refetch } = useHotelRoomQr()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
          <QrCode size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text!">Room QR</h2>
          <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">Scan to open in-room ordering</p>
        </div>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading rooms…" />}
      {isError && <LegacyErrorCard title="Couldn't load rooms" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {rooms && (
        <Card className="!h-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text!">Room QR Codes</h3>
              <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">{rooms.length} Rooms</span>
            </div>
            <button
              type="button"
              disabled={rooms.length === 0}
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <Printer size={14} /> Print all
            </button>
          </div>
          <p className="text-xs text-text-faint mt-1 mb-3">Print &amp; place in each room. Scanning opens that room's in-room ordering page.</p>

          {rooms.length === 0 ? (
            <p className="text-sm text-text-faint italic py-6 text-center">No rooms.</p>
          ) : (
            <div className="flex flex-wrap gap-3.5">
              {rooms.map((r) => (
                <RoomQrCard key={r.no} no={r.no} type={r.type} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
