import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useAutomaticPurchaseList } from '../zraLists.queries'
import { ListHeader, ListPagination, SearchBox, TableShell, EmptyRow, PER_PAGE } from './ZraListChrome'
import { formatMoney } from '../../../utils/format'

export function AutomaticPurchaseList() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error } = useAutomaticPurchaseList({ page, perPage: PER_PAGE, search })
  const rows = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="space-y-4">
      <ListHeader icon={<ShoppingCart size={20} className="text-brand" />} title="ZRA Automatic Purchase" count={data?.total} />

      <div className="max-w-sm">
        <SearchBox
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
          placeholder="Search invoice no, supplier…"
        />
      </div>

      <TableShell>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-alt">
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-3 py-3">Invoice No</th>
              <th className="font-medium px-3 py-3">Supplier Details</th>
              <th className="font-medium px-3 py-3">Receipt Type</th>
              <th className="font-medium px-3 py-3">Confirmation Date</th>
              <th className="font-medium px-3 py-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <EmptyRow
              colSpan={5}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rows.length === 0}
              emptyLabel="No pending purchases found."
              feature="ZRA Automatic Purchase"
            />
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border align-top hover:bg-surface-hover">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-text! font-medium">{row.invoiceNo}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Sale Date:</span> {row.saleDate}
                  </div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Item Count:</span> {row.itemCount}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-text!">{row.supplierName}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Tpin:</span> {row.supplierTpin}
                  </div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Branch:</span> {row.supplierBranch}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-text!">{row.receiptTypeCode}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Payment Type:</span> {row.paymentTypeCode}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-text!">{row.confirmationDate}</div>
                  {row.remark && <div className="text-text-faint">Remark: {row.remark}</div>}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <div className="text-text! font-medium">{formatMoney(row.totalAmount)}</div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Taxable:</span> {formatMoney(row.taxableAmount)}
                  </div>
                  <div className="text-text-faint">
                    <span className="text-text-muted">Tax:</span> {formatMoney(row.taxAmount)}
                  </div>
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
