import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { usePendingPurchasesList } from '../zraLists.queries'
import { formatMoney } from '../../../utils/format'
import { ListHeader, ListPagination, SearchBox, TableShell, EmptyRow, ZraStatusBadge, PER_PAGE } from './ZraListChrome'

export function PendingPurchaseInvoicesList() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = usePendingPurchasesList({ page, perPage: PER_PAGE, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-4">
      <ListHeader icon={<ShoppingCart size={20} className="text-brand" />} title="ZRA Pending Purchase Invoices" count={total} />

      <div className="max-w-sm">
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
          placeholder="Search ref, vendor…"
        />
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">Ref</th>
              <th className="font-medium px-3 py-3">Ref. Vendor</th>
              <th className="font-medium px-3 py-3">Invoice Date</th>
              <th className="font-medium px-3 py-3">Due Date</th>
              <th className="font-medium px-3 py-3">Third-party</th>
              <th className="font-medium px-3 py-3">Payment Type</th>
              <th className="font-medium px-3 py-3">Amount (excl. tax)</th>
              <th className="font-medium px-3 py-3">Status</th>
              <th className="font-medium px-3 py-3">Zra Status</th>
            </tr>
          </thead>
          <tbody>
            <EmptyRow colSpan={9} isLoading={isLoading} isError={isError} isEmpty={rows.length === 0} emptyLabel="No pending purchase invoices found." />
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-hover">
                <td className="px-3 py-3 text-brand font-medium">{row.ref}</td>
                <td className="px-3 py-3 text-text-muted">{row.refVendor || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.invoiceDate}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">{row.dueDate || '-'}</td>
                <td className="px-3 py-3 text-text!">
                  {row.thirdParty}
                  {row.thirdPartyAlias && <div className="text-text-faint text-xs">{row.thirdPartyAlias}</div>}
                </td>
                <td className="px-3 py-3 text-text-muted">{row.paymentType || '-'}</td>
                <td className="px-3 py-3 text-text-muted whitespace-nowrap">
                  {formatMoney(row.amountInclTax)}
                  <div className="text-text-faint text-xs">
                    HT: {formatMoney(row.amountExclTax)} | VAT: {formatMoney(row.vat)}
                  </div>
                </td>
                <td className="px-3 py-3 text-text-muted">{row.status}</td>
                <td className="px-3 py-3">
                  <ZraStatusBadge synced={row.zraSucceeded} label={row.zraStatusMessage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <ListPagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} />
    </div>
  )
}
