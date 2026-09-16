import { useMemo, useState } from 'react'
import { UserRoundCheck, LoaderCircle } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { avatarColorFor, initialsFor } from '../../../shared/avatarColor'
import { useHotelGuests, useHotelCustSync, useHotelToken } from '../hotel.queries'

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
  return (
    <div className="flex items-center gap-1.5">
      {synced ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-fg">{zrastatus || 'It is succeeded'}</span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg" title={zrastatus || 'Not synced'}>
          {zrastatus ? 'Failed' : 'Not synced'}
        </span>
      )}
      <button
        type="button"
        disabled={!token || sync.isPending}
        onClick={() => token && sync.mutate({ id, token })}
        className="text-xs text-brand hover:underline disabled:opacity-50"
      >
        {sync.isPending ? <LoaderCircle size={11} className="inline animate-spin" /> : 'Update ZRA'}
      </button>
    </div>
  )
}

// Real via custom/hotel/api.php?r=guests — the Hotel Suite app's own Guest
// Directory (backed by Dolibarr's core societe/customer table — the classic
// Tenants/List Tenant sidebar pages read the exact same data, superseded
// here). ZRA sync (a=custsync) is real and wired; edit/docs stay for a
// later pass.
export function HotelGuests() {
  const { data: guests, isLoading, isError, error, refetch } = useHotelGuests()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

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
            <h2 className="text-lg font-bold text-text!">Guest Directory</h2>
            <p className="text-xs text-text-faint mt-0.5">{guests ? `${guests.length} profiles` : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading guests…" />}
        {isError && <LegacyErrorCard title="Couldn't load guests" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {guests && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
              <h3 className="font-semibold text-text!">Guests</h3>
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
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((g) => {
                      const tier = tierFor(Number(g.val))
                      return (
                        <tr key={g.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${ICON_STYLES[avatarColorFor(g.name)]}`}>
                                {initialsFor(g.name)}
                              </span>
                              <span className="text-text!">{g.name}</span>
                            </div>
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
    </div>
  )
}
