import { useMemo, useState } from 'react'
import { MessageSquareText, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useHotelEnquiries, useHotelSaveEnquiry, useHotelDelEnquiry, useHotelToken } from '../hotel.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Real page: booking/reservation/enquiry.php (mainmenu=hotel&leftmenu=
// enqry_obj) — via custom/hotel/api.php?r=enquiries (real Suite resource,
// same one the old combined Concierge card used — see that component's own
// note on why this leaf was carved out into its own page). Every column
// here is a real field (id/name/email/phone/ci/co/created); there's no
// status or room column on the real classic page either, so none is added.
// "+Add" opens the same real saveenquiry write inline (no separate legacy
// create page to mirror — the classic page's own "Add" just opens a plain
// modal with these same fields).
export function HotelEnquiryPage() {
  const { data: token } = useHotelToken()
  const { data: enquiries, isLoading, isError, error, refetch } = useHotelEnquiries()
  const save = useHotelSaveEnquiry()
  const del = useHotelDelEnquiry()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ci, setCi] = useState('')
  const [co, setCo] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = enquiries ?? []
    if (!q) return rows
    return rows.filter((e) => `${e.name} ${e.email} ${e.phone}`.toLowerCase().includes(q))
  }, [enquiries, search])
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  function handleSave() {
    if (!token) return
    if (!name.trim()) return setFormError('Name is required.')
    setFormError('')
    save.mutate(
      { name, email, phone, ci, co, message, token },
      {
        onSuccess: () => {
          setShowForm(false)
          setName('')
          setEmail('')
          setPhone('')
          setCi('')
          setCo('')
          setMessage('')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed to save.'),
      },
    )
  }

  function handleDelete(id: string) {
    if (!token) return
    if (!confirm('Delete this enquiry?')) return
    setDeleting(id)
    del.mutate({ id, token }, { onSettled: () => setDeleting(null) })
  }

  function getExportData() {
    return {
      headers: ['Sl.No', 'Name', 'Email', 'Phone', 'Check In', 'Check Out'],
      rows: filtered.map((e, i) => [String(i + 1), e.name, e.email || '—', e.phone || '—', e.ci || '—', e.co || '—']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand">
              <MessageSquareText size={22} />
            </span>
            <h2 className="text-lg font-bold text-text!">Enquiry</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        {isLoading && <LegacyLoadingCard label="Loading enquiries…" />}
        {isError && <LegacyErrorCard title="Couldn't load enquiries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {showForm && (
          <Card className="!h-auto">
            <h3 className="font-semibold text-text! mb-3">New enquiry</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-danger mb-1">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Check In</label>
                <input type="date" value={ci} onChange={(e) => setCi(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Check Out</label>
                <input type="date" value={co} onChange={(e) => setCo(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs text-text-muted mb-1">Notes / requirements</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-input-border bg-input-bg text-text text-sm" />
              </div>
            </div>
            {formError && <p className="text-sm text-danger mt-3">{formError}</p>}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                disabled={!token || save.isPending}
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {save.isPending && <LoaderCircle size={14} className="animate-spin" />} Save
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
                Cancel
              </button>
            </div>
          </Card>
        )}

        {enquiries && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
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
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className={`w-64 ${inputCls}`}
                />
                <TableExportButtons title="Enquiry" getExportData={getExportData} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-text-faint italic py-6 text-center">{enquiries.length === 0 ? 'No Data Available In Table' : 'No enquiries match this search.'}</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-3 py-2">Sl.No</th>
                      <th className="font-medium px-3 py-2">Name</th>
                      <th className="font-medium px-3 py-2">Email</th>
                      <th className="font-medium px-3 py-2">Phone</th>
                      <th className="font-medium px-3 py-2">Check In</th>
                      <th className="font-medium px-3 py-2">Check Out</th>
                      <th className="font-medium px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((e, i) => (
                      <tr key={e.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-text-muted">{(page - 1) * perPage + i + 1}</td>
                        <td className="px-3 py-2.5 text-text!">{e.name || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{e.email || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{e.phone || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{e.ci || '—'}</td>
                        <td className="px-3 py-2.5 text-text-muted">{e.co || '—'}</td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            disabled={!token || deleting === e.id}
                            onClick={() => handleDelete(e.id)}
                            title="Delete"
                            className="p-1.5 rounded-md text-danger hover:bg-surface-hover disabled:opacity-50"
                          >
                            {deleting === e.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {enquiries && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
