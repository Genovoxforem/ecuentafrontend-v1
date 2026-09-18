import { useEffect, useRef, useState } from 'react'
import { X, LoaderCircle, Upload, Trash2 } from 'lucide-react'
import {
  useHotelGuestHistory,
  useHotelSaveCustomer,
  useHotelSaveGuestProfile,
  useHotelSaveGuestPrefs,
  useHotelGuestDocs,
  useHotelUploadDoc,
  useHotelDelDoc,
  useHotelToken,
} from '../hotel.queries'

type Tab = 'profile' | 'history' | 'id' | 'docs'
const fieldCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const STATUS_TAG: Record<string, string> = { checkin: 'bg-success-bg text-success-fg', checkout: 'bg-neutral-bg text-neutral-fg', cancelled: 'bg-warning-bg text-warning-fg', noshow: 'bg-danger-bg text-danger-fg' }

// r=guesthistory + a=savecustomer/saveguestid/savepref, r=docs + a=uploaddoc/
// deldoc — the real Guest Directory's own "View" detail (guestDetail() in
// custom/hotel/app.php), reproduced field-for-field from that file's own
// guestDetail/guestDocsList functions.
export function HotelGuestDetailModal({ id, onClose, initialTab = 'profile' }: { id: string; onClose: () => void; initialTab?: Tab }) {
  const { data: token } = useHotelToken()
  const { data: hist, isLoading, isError, error, refetch } = useHotelGuestHistory(id)
  const [tab, setTab] = useState<Tab>(initialTab)

  const saveCustomer = useHotelSaveCustomer()
  const saveProfile = useHotelSaveGuestProfile()
  const savePrefs = useHotelSaveGuestPrefs()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [town, setTown] = useState('')
  const [tpin, setTpin] = useState('')
  const [idno, setIdno] = useState('')
  const [nationality, setNationality] = useState('')
  const [idType, setIdType] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [dob, setDob] = useState('')
  const [vip, setVip] = useState(false)
  const [taxExempt, setTaxExempt] = useState(false)
  const [prefs, setPrefs] = useState('')

  useEffect(() => {
    if (!hist) return
    setName(hist.guest.name || '')
    setEmail(hist.guest.email || '')
    setPhone(hist.guest.phone || '')
    setTown(hist.guest.town || '')
    setTpin(hist.guest.tpin || '')
    setIdno(hist.guest.idno || '')
    setPrefs(hist.profile?.prefs ?? hist.guest.prefs ?? '')
    setNationality(hist.profile?.nationality ?? '')
    setIdType(hist.profile?.id_type ?? '')
    setIdNumber(hist.profile?.id_number ?? '')
    setDob(hist.profile?.dob ?? '')
    setVip(hist.profile?.vip === 1)
    setTaxExempt(hist.profile?.tax_exempt === 1)
  }, [hist])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text!">{hist?.guest.name || 'Guest'}</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>

        {isLoading && <p className="px-5 py-6 text-sm text-text-faint text-center">Loading…</p>}
        {isError && <p className="px-5 py-6 text-sm text-danger-fg text-center">{error instanceof Error ? error.message : 'Could not load guest.'}</p>}

        {hist && (
          <>
            <div className="flex gap-4 px-5 border-b border-border">
              {(
                [
                  ['profile', 'Profile'],
                  ['history', `Stays (${hist.bookings.length})`],
                  ['id', 'ID & Preferences'],
                  ['docs', 'Documents'],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`pb-2.5 pt-3 text-xs font-medium border-b-2 -mb-px ${tab === key ? 'text-text! border-brand' : 'text-text-faint border-transparent hover:text-text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="px-5 py-4">
              {tab === 'profile' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Name</span>
                      <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Email</span>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Phone</span>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Town</span>
                      <input value={town} onChange={(e) => setTown(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block col-span-2">
                      <span className="block text-xs text-text-muted mb-1">Address</span>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">TPIN</span>
                      <input value={tpin} onChange={(e) => setTpin(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">ID No.</span>
                      <input value={idno} onChange={(e) => setIdno(e.target.value)} className={fieldCls} />
                    </label>
                  </div>
                  {saveCustomer.isError && <p className="text-xs text-danger-fg">{saveCustomer.error instanceof Error ? saveCustomer.error.message : 'Failed.'}</p>}
                  <button
                    type="button"
                    disabled={!token || saveCustomer.isPending}
                    onClick={() =>
                      token &&
                      saveCustomer.mutate({ id, name, email, phone, address, zip: '', town, country: hist.guest.fk_pays, tpin, idno, token }, { onSuccess: () => refetch() })
                    }
                    className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {saveCustomer.isPending && <LoaderCircle size={12} className="animate-spin" />} Save profile
                  </button>
                </div>
              )}

              {tab === 'history' && (
                <div>
                  {hist.bookings.length === 0 ? (
                    <p className="text-sm text-text-faint italic py-4 text-center">No stays yet.</p>
                  ) : (
                    hist.bookings.map((b) => (
                      <div key={b.num} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                        <div>
                          <p className="text-text!">{b.num}</p>
                          <p className="text-xs text-text-faint">
                            {b.ci} → {b.co}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TAG[b.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{b.status}</span>
                          <span className="text-text! text-sm">K{Number(b.amt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'id' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Nationality</span>
                      <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">ID Type</span>
                      <input value={idType} onChange={(e) => setIdType(e.target.value)} placeholder="Passport / NRC" className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">ID Number</span>
                      <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Date of birth</span>
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={fieldCls} />
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-sm text-text-muted">
                      <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} /> VIP
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-text-muted">
                      <input type="checkbox" checked={taxExempt} onChange={(e) => setTaxExempt(e.target.checked)} /> Tax exempt
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={!token || saveProfile.isPending}
                    onClick={() => token && saveProfile.mutate({ id, nationality, idType, idNumber, dob, vip, taxExempt, token }, { onSuccess: () => refetch() })}
                    className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {saveProfile.isPending && <LoaderCircle size={12} className="animate-spin" />} Save ID details
                  </button>

                  <div className="pt-2 border-t border-border">
                    <label className="block">
                      <span className="block text-xs text-text-muted mb-1">Preferences</span>
                      <textarea value={prefs} onChange={(e) => setPrefs(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none" />
                    </label>
                    <button
                      type="button"
                      disabled={!token || savePrefs.isPending}
                      onClick={() => token && savePrefs.mutate({ id, prefs, token }, { onSuccess: () => refetch() })}
                      className="mt-2 flex items-center gap-1.5 rounded-md border border-input-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
                    >
                      {savePrefs.isPending && <LoaderCircle size={12} className="animate-spin" />} Save preferences
                    </button>
                  </div>
                </div>
              )}

              {tab === 'docs' && <GuestDocsPanel socid={id} token={token} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function GuestDocsPanel({ socid, token }: { socid: string; token: string | undefined }) {
  const { data: docs, isLoading, refetch } = useHotelGuestDocs(socid)
  const upload = useHotelUploadDoc()
  const del = useHotelDelDoc()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-sm text-text-faint">Loading…</p>}
      {(docs ?? []).length === 0 && !isLoading ? (
        <p className="text-sm text-text-faint italic py-2 text-center">No documents yet.</p>
      ) : (
        (docs ?? []).map((d) => (
          <div key={d.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm">
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all">
              {d.name}
            </a>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-text-faint">{d.date || ''}</span>
              <button
                type="button"
                disabled={!token || del.isPending}
                onClick={() => token && confirm('Delete this document?') && del.mutate({ socid, file: d.name, token }, { onSuccess: () => refetch() })}
                className="text-danger-fg hover:underline"
              >
                <Trash2 size={13} />
              </button>
            </span>
          </div>
        ))
      )}
      <div className="pt-2">
        <input
          ref={fileRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && token) upload.mutate({ socid, file, token }, { onSuccess: () => { refetch(); if (fileRef.current) fileRef.current.value = '' } })
          }}
          className="hidden"
        />
        <button
          type="button"
          disabled={!token || upload.isPending}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-input-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
        >
          {upload.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <Upload size={12} />} Upload document
        </button>
        {upload.isError && <p className="text-xs text-danger-fg mt-1">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}
      </div>
    </div>
  )
}
