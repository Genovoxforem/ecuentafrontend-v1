import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ROUTES } from '../../../routes'
import { useContacts, type ContactKind } from '../contacts.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// Real GET /api/contacts/?kind=customer data (see contacts.queries.ts) —
// server-side search + pagination, matching how the endpoint itself is
// built rather than fetching everything and slicing client-side. Columns
// match the legacy List Of Contacts/Addresses page exactly (Last Name,
// First Name, Phone, Email, Third-Party [+ company sub-line], Visibility,
// Environment, Status) — "Environment" is real too (llx_socpeople.entity),
// just always "Master Entity" on this single-entity install.
export function ContactListPage({ kind = 'customer' }: { kind?: ContactKind }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useContacts(kind, search, page, perPage)

  useEffect(() => {
    setPage(1)
  }, [search, perPage, kind])

  const rows = data?.items ?? []
  const total = data?.total ?? 0

  function getExportData() {
    return {
      headers: ['Last Name', 'First Name', 'Phone', 'Email', 'Third-Party', 'Company', 'Visibility', 'Environment', 'Status'],
      rows: rows.map((r) => [
        r.lastName ?? '',
        r.firstName ?? '',
        r.phoneMobile || r.phonePro || r.phonePerso || '',
        r.email ?? '',
        r.companyName ?? '',
        r.companyName ?? '',
        r.priv ? 'Private' : 'Shared',
        r.entity === 1 ? 'Master Entity' : String(r.entity),
        r.statusLabel,
      ]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Users size={20} className="text-brand" /> List Of Contacts/Addresses (Customers)
        </h2>
        <Link to={ROUTES.contactCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> Create Contact/Address
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="List Of Contacts" getExportData={getExportData} />
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface z-[1]">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-4 py-2.5">Last Name</th>
                  <th className="font-medium px-4 py-2.5">First Name</th>
                  <th className="font-medium px-4 py-2.5">Phone</th>
                  <th className="font-medium px-4 py-2.5">Email</th>
                  <th className="font-medium px-4 py-2.5">Third-Party</th>
                  <th className="font-medium px-4 py-2.5">Visibility</th>
                  <th className="font-medium px-4 py-2.5">Environment</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-danger">
                      Could not load contacts.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-brand font-medium">{r.lastName || '-'}</td>
                      <td className="px-4 py-3 text-text!">{r.firstName || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.phoneMobile || r.phonePro || r.phonePerso || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.email || '-'}</td>
                      <td className="px-4 py-3">
                        {r.companyName ? (
                          <div className="leading-tight">
                            <div className="text-brand">{r.companyName}</div>
                          </div>
                        ) : (
                          <span className="text-text-faint">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.priv ? 'Private' : 'Shared'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.entity === 1 ? 'Master Entity' : r.entity}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.statusLabel === 'Enabled' ? 'bg-success-bg text-success-fg' : 'bg-surface-hover text-text-muted'}`}>
                          {r.statusLabel === 'Enabled' ? 'Open' : r.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={page} perPage={perPage} total={total} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
