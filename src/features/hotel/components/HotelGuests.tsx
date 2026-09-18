import { useMemo, useState } from 'react'
import { UserRoundCheck, LoaderCircle, Check, X } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { useHotelGuests, useHotelCustSync, useHotelSaveGuest, useHotelToken } from '../hotel.queries'
import { HotelGuestDetailModal } from './HotelGuestDetailModal'

const inputFieldCls = 'h-9 w-full px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function AddGuestModal({ onClose }: { onClose: () => void }) {
  const { data: token } = useHotelToken()
  const save = useHotelSaveGuest()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!name.trim()) return setError('Full name is required.')
    if (!token) return setError('Not ready yet — try again in a moment.')
    save.mutate({ id: '', name: name.trim(), email, phone, token }, { onSuccess: () => onClose(), onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save.') })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text!">Add guest</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className={inputFieldCls} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputFieldCls} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputFieldCls} />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {save.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function tierFor(val: number): { label: string; cls: string } {
  if (val > 100000) return { label: 'Platinum', cls: 'bg-slate-100 text-slate-700 border-slate-300' }
  if (val > 40000) return { label: 'Gold', cls: 'bg-amber-50 text-amber-700 border-amber-300' }
  return { label: 'Silver', cls: 'bg-gray-50 text-gray-600 border-gray-300' }
}

function ZraCell({ id, zraid, zrastatus }: { id: string; zraid: string; zrastatus: string }) {
  const { data: token } = useHotelToken()
  const sync = useHotelCustSync()
  const synced = !!zraid && /succe/i.test(zrastatus || '')
  if (synced) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-fg">{zrastatus || 'It is succeeded'}</span>
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg" title={zrastatus || 'Not synced'}>
        {zrastatus ? 'Failed' : 'Not synced'}
      </span>
      <button
        type="button"
        disabled={!token || sync.isPending}
        onClick={() => token && sync.mutate({ id, token })}
        className="text-xs text-brand hover:underline disabled:opacity-50"
      >
        {sync.isPending ? <LoaderCircle size={11} className="inline animate-spin" /> : 'Update to ZRA'}
      </button>
    </div>
  )
}

// Real via custom/hotel/api.php?r=guests — the Hotel Suite app's own Guest
// Directory (backed by Dolibarr's core societe/customer table — the classic
// Tenants/List Tenant sidebar pages read the exact same data, superseded
// here). ZRA sync (a=custsync) is real and wired; clicking a guest or the
// row's own "Edit"/"Docs" buttons opens the real detail view
// (HotelGuestDetailModal.tsx: profile edit, stay history, ID/preferences
// and documents — r=guesthistory/docs, a=savecustomer/saveguestid/
// savepref/uploaddoc/deldoc), matching the real page's own guestEdit()/
// guestDocs() both opening the same modal on different tabs. "+ Add guest"
// uses the real a=saveguest action (confirmed live by reading the Suite's
// own saveGuest() JS: only name/email/phone are actually sent, even though
// its own modal shows an unused Address field too). ZraCell only shows the
// "Update to ZRA" button when NOT already synced — confirmed live: the real
// page's own succeeded rows show just the badge, no button.
export function HotelGuests() {
  const { data: guests, isLoading, isError, error, refetch } = useHotelGuests()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [viewingTab, setViewingTab] = useState<'profile' | 'docs'>('profile')
  const [addingGuest, setAddingGuest] = useState(false)

  function openGuest(id: string, tab: 'profile' | 'docs') {
    setViewingId(id)
    setViewingTab(tab)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = guests ?? []
    if (!q) return rows
    return rows.filter((g) => `${g.name} ${g.email} ${g.phone} ${g.code}`.toLowerCase().includes(q))
  }, [guests, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Guest', 'Email', 'Phone', 'Tier', 'Stays', 'Last stay', 'Lifetime value', 'Customer Code', 'ZRA Status'],
      rows: filtered.map((g) => [g.name, g.email, g.phone, tierFor(Number(g.val)).label, g.stays, g.last ?? '-', g.val, g.code || '-', g.zrastatus || 'Not synced']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
            <UserRoundCheck size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text!">Guests</h2>
            <p className="text-xs text-text-faint mt-0.5 uppercase tracking-wide">Guest CRM</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading guests…" />}
        {isError && <LegacyErrorCard title="Couldn't load guests" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {guests && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-text!">Guest Directory</h3>
                <button
                  type="button"
                  onClick={() => setAddingGuest(true)}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                >
                  + Add guest
                </button>
                <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">{guests.length} profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by name, email or phone…"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Hotel Guests" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{guests.length === 0 ? 'No guests yet.' : 'No guests match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Guest</th>
                      <th className="font-medium px-3 py-2">Contact</th>
                      <th className="font-medium px-3 py-2">Tier</th>
                      <th className="font-medium px-3 py-2">Stays</th>
                      <th className="font-medium px-3 py-2">Last stay</th>
                      <th className="font-medium px-3 py-2 text-right">Lifetime value</th>
                      <th className="font-medium px-3 py-2">Customer Code</th>
                      <th className="font-medium px-3 py-2">ZRA Status</th>
                      <th className="font-medium px-3 py-2">Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((g) => {
                      const tier = tierFor(Number(g.val))
                      return (
                        <tr key={g.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5">
                            <button type="button" onClick={() => openGuest(g.id, 'profile')} className="flex items-center gap-2 hover:underline">
                              <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(g.name)]}`}>
                                {initialsFor(g.name)}
                              </span>
                              <span className="text-text!">{g.name}</span>
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-text-muted">{[g.email, g.phone].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${tier.cls}`}>{tier.label}</span>
                          </td>
                          <td className="px-3 py-2.5 text-text-muted">{g.stays}</td>
                          <td className="px-3 py-2.5 text-text-muted">{g.last ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right text-text!">K{Number(g.val).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-text-muted">{g.code || '—'}</td>
                          <td className="px-3 py-2.5">
                            <ZraCell id={g.id} zraid={g.zraid} zrastatus={g.zrastatus} />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <button type="button" onClick={() => openGuest(g.id, 'profile')} className="text-xs text-brand hover:underline mr-3">
                              Edit
                            </button>
                            <button type="button" onClick={() => openGuest(g.id, 'docs')} className="text-xs text-brand hover:underline">
                              Docs
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {guests && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}

      {viewingId && <HotelGuestDetailModal id={viewingId} initialTab={viewingTab} onClose={() => setViewingId(null)} />}
      {addingGuest && <AddGuestModal onClose={() => setAddingGuest(false)} />}
    </div>
  )
}
