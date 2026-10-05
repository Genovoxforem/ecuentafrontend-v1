import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { useContacts, type ContactKind, type ContactRow } from '../contacts.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const KIND_LABEL: Record<ContactKind, string> = {
  customer: 'Customers',
  vendor: 'Vendors',
}

type SortKey = 'lastName' | 'firstName' | 'phone' | 'email' | 'thirdParty'

function sortValue(r: ContactRow, key: SortKey): string | number {
  switch (key) {
    case 'lastName':
      return r.lastname ?? ''
    case 'firstName':
      return r.firstname ?? ''
    case 'phone':
      return r.phone_pro ?? ''
    case 'email':
      return r.email ?? ''
    case 'thirdParty':
      return r.third_party_name ?? r.third_party_code ?? ''
  }
}

export function ContactListPage({ kind = 'customer' }: { kind?: ContactKind }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useContacts(kind, search, page, perPage)
  const createRoute = kind === 'vendor' ? ROUTES.vendorContactCreate : ROUTES.contactCreate
  const detailRoute = kind === 'vendor' ? ROUTES.vendorContactDetail : ROUTES.contactDetail

  useEffect(() => {
    setPage(1)
  }, [search, perPage, kind])

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<ContactRow, SortKey>(rows, sortValue)

  function getExportData() {
    return {
      headers: ['Last Name', 'First Name', 'Phone', 'Email', 'Third-Party'],
      rows: sortedRows.map((r) => [r.lastname ?? '', r.firstname ?? '', r.phone_pro ?? '', r.email ?? '', r.third_party_name ?? r.third_party_code ?? '']),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Users size={20} className="text-brand" /> List Of Contacts/Addresses ({KIND_LABEL[kind]})
        </h2>
        <Link to={createRoute} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
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
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="lastName" sort={sort} onSort={toggleSort}>Last Name</Th>
                  <Th sortKey="firstName" sort={sort} onSort={toggleSort}>First Name</Th>
                  <Th sortKey="phone" sort={sort} onSort={toggleSort}>Phone</Th>
                  <Th sortKey="email" sort={sort} onSort={toggleSort}>Email</Th>
                  <Th sortKey="thirdParty" sort={sort} onSort={toggleSort}>Third-Party</Th>
                  <Th>Visibility</Th>
                  <Th>Status</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4">
                      <span className="text-danger">Could not load contacts.</span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <Link to={detailRoute.replace(':id', String(r.id))} className="text-brand font-medium hover:underline">
                          {r.lastname || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text!">{r.firstname || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.phone_pro || r.phone_mobile || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.email || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.third_party_name || r.third_party_code || '-'}</td>
                      <td className="px-4 py-3 text-text-faint">{r.priv === 1 ? 'Private' : 'Public'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 1 ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                          {r.status === 1 ? 'Active' : 'Inactive'}
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
