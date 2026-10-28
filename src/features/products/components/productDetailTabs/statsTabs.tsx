import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, ChartPie, ShoppingCart, Link2, AlertTriangle, Boxes, TrendingUp, UserRound, DollarSign } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { formatMoney, formatNumber, formatDateTimeAmPm } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../LegacyReportStates'
import { isBackendUnavailable, isBackendActionUnavailable, BackendUnavailableCard } from '../../../../shared/components/BackendUnavailable'
import { useProductMargins, useProductStatsOverview, useProductInvoiceStats } from '../../products.queries'
import { Th, Td, EmptyRow, TabTable, SectionHeader, MetricTile, modalInputCls } from '../ProductDetailShared'

// Statistics tab (stats_api.php) - real sales/purchase figures computed
// server-side from llx_facturedet/llx_commande_fournisseurdet, replaces the
// old legacy-scrape usage report.
export function StatisticsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductStatsOverview(id)
  if (isLoading) return <LegacyLoadingCard label="Loading statistics..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Statistics" />
  if (isError) return <LegacyErrorCard title="Couldn't load statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile icon={DollarSign} color="green" label="Total Sales" value={formatMoney(data.totalSales)} caption={data.periodLabel} />
        <MetricTile icon={ShoppingCart} color="amber" label="Total Purchase" value={formatMoney(data.totalPurchase)} caption={data.periodLabel} />
        <MetricTile icon={Boxes} color="blue" label="Qty Sold" value={formatNumber(data.qtySold)} caption={data.periodLabel} />
        <MetricTile icon={TrendingUp} color="violet" label="Margin" value={`${data.marginPct.toFixed(1)}%`} caption="Sales vs. purchase" />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={TrendingUp} color="indigo">
          Monthly Sales &amp; Purchases (12 months)
        </SectionHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly.map((m) => ({ month: m.month, Sales: m.sales, Purchase: m.purchase ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Sales" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Purchase" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={ChartPie} color="indigo">
          Monthly Breakdown
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Month</Th>
              <Th right>Sales</Th>
              <Th right>Purchase</Th>
              <Th right>Qty</Th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.length === 0 ? (
              <EmptyRow span={4} label="No sales or purchase activity yet." />
            ) : (
              data.monthly.map((m) => (
                <tr key={m.month} className="border-b border-border last:border-0">
                  <Td muted>{m.month}</Td>
                  <Td right>{formatMoney(m.sales)}</Td>
                  <Td right muted>
                    {m.purchase === null ? '—' : formatMoney(m.purchase)}
                  </Td>
                  <Td right muted>
                    {formatNumber(m.qty)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>

      <Card className="!h-auto">
        <SectionHeader icon={UserRound} color="cyan">
          Top Customers
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Customer</Th>
              <Th right>Qty</Th>
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.topCustomers.length === 0 ? (
              <EmptyRow span={3} label="No customers have purchased this product yet." />
            ) : (
              data.topCustomers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <Td>{c.name}</Td>
                  <Td right muted>
                    {formatNumber(c.qty)}
                  </Td>
                  <Td right>{formatMoney(c.total)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TabTable>
      </Card>
    </div>
  )
}

// Legacy's Related Items rows link out to that document type's own list
// page (propal.php, commande.php, facture.php, ...), each pre-filtered to
// this product - this app has no per-product filter on those list pages
// yet, so these route to the list module for that document type instead
// (same destination a user would reach from the sidebar), rather than
// routing back to the legacy PHP page. Matched by keyword rather than exact
// string since the API's referer labels aren't a fixed enum ("Purchase
// orders" is lowercase "orders" unlike its siblings).
// The names the classic Related Items table prints.
const CLASSIC_RELATED: Record<string, string> = {
  quotations: 'Quotations',
  'sales orders': 'Sales Orders',
  'purchase orders': 'Purchase Orders',
  'customer invoices': 'Customers Invoices',
  'vendor invoices': 'Vendors Invoices',
  contracts: 'Contracts',
}

const classicRelatedName = (label: string) => CLASSIC_RELATED[label.trim().toLowerCase()] ?? label

function refererListRoute(label: string): string | null {
  const l = label.toLowerCase()
  if (l.includes('quotation')) return ROUTES.quotationList
  if (l.includes('supplierproposal') || l.includes('supplier proposal')) return ROUTES.supplierProposalList
  if (l.includes('sales order')) return ROUTES.orderList
  if (l.includes('purchase order')) return ROUTES.purchaseOrderList
  if (l.includes('customer') && l.includes('invoice')) return ROUTES.invoiceList
  if (l.includes('vendor') && l.includes('invoice')) return ROUTES.vendorInvoiceList
  if (l.includes('contract')) return ROUTES.contractList
  return null
}

// Invoice Stats tab (invoice_stats_api.php) - customer invoices with this
// product, paginated + filterable by month/year. Mirrors legacy's "Related items"
// table exactly (product/stats/facture.php), with Period/Year/PageSize filters
// and invoices detail table.
export function InvoiceStatsTab({ id }: { id: string | undefined }) {
  const [page, setPage] = useState(0)
  const [month, setMonth] = useState(0)
  const [year, setYear] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const { data, isLoading, isError, error, refetch } = useProductInvoiceStats(id, page, month, year, pageSize)

  if (isLoading) return <LegacyLoadingCard label="Loading invoice stats..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Invoice Stats" />
  if (isError) return <LegacyErrorCard title="Couldn't load invoice stats" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  if (!data) return null

  const pageStart = page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, data.totalRecords)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricTile icon={DollarSign} color="green" label="Invoiced Total" value={formatMoney(data.totalHT)} caption="Excl. tax, all customer invoices" />
        <MetricTile icon={Boxes} color="blue" label="Total Qty Invoiced" value={formatNumber(data.totalQty)} caption="Units across all invoices" />
        <MetricTile icon={FileText} color="violet" label="Invoice Lines" value={formatNumber(data.totalRecords)} caption="Matching current filter" />
      </div>

      <Card className="!h-auto">
        <SectionHeader icon={Link2} color="indigo">
          Related Items
        </SectionHeader>
        <TabTable>
          <thead>
            <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <Th>Related Items</Th>
              <Th right>Number Of Third Parties</Th>
              <Th right>Number Of Related Items</Th>
              <Th right>Total Quantity</Th>
            </tr>
          </thead>
          <tbody>
            {data.referers.length === 0 ? (
              <EmptyRow span={4} label="No related items for this product." />
            ) : (
              data.referers.map((r) => {
                const route = refererListRoute(r.label)
                return (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <Td>
                      {route ? (
                        <Link to={route} className="text-brand hover:underline">
                          {classicRelatedName(r.label)}
                        </Link>
                      ) : (
                        classicRelatedName(r.label)
                      )}
                    </Td>
                    <Td right muted>
                      {r.nbThirdparties === null ? '—' : formatNumber(r.nbThirdparties)}
                    </Td>
                    <Td right muted>
                      {r.nbObjects}
                    </Td>
                    <Td right>{r.qty}</Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </TabTable>
      </Card>

      <Card className="!h-auto flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <SectionHeader icon={FileText} color="green">
              Customer Invoices
            </SectionHeader>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-surface text-xs font-medium text-text-faint">
              {formatNumber(data.totalRecords)} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 -mx-4 px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Period</label>
              <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value) || 0); setPage(0) }} className={modalInputCls + ' py-1.5'}>
                <option value="0">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-faint">Year</label>
              <select value={year} onChange={(e) => { setYear(parseInt(e.target.value) || 0); setPage(0) }} className={modalInputCls + ' py-1.5'}>
                <option value="0">All Years</option>
                {data.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-text-faint">Page Size</label>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 20); setPage(0) }} className={modalInputCls + ' py-1.5 w-24'}>
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setMonth(0)
                  setYear(0)
                  setPageSize(20)
                  setPage(0)
                }}
                className="px-3 py-1.5 rounded-md border border-border text-sm text-text-muted hover:bg-surface-hover"
              >
                Remove filter
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col -mx-4 border border-border rounded overflow-hidden isolate">
            <div className="overflow-y-auto max-h-[550px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border">
                    <Th>Ref.</Th>
                    <Th>Company</Th>
                    <Th>Customer Code</Th>
                    <Th>Invoice Date</Th>
                    <Th right>Qty</Th>
                    <Th right>Amount (Excl. Tax)</Th>
                    <Th right>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {!data.invoices || data.invoices.length === 0 ? (
                    <EmptyRow span={7} label="No Record Found" />
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <Td muted>
                          {/* No per-invoice detail page exists in this rebuild yet
                              (routes.ts has no invoiceDetail route) - routes to the
                              real Invoices module rather than back to the legacy
                              facture.php card, consistent with the Related Items
                              links above. */}
                          <Link to={ROUTES.invoiceList} className="text-brand hover:underline">
                            {inv.ref}
                          </Link>
                        </Td>
                        <Td>
                          <Link to={ROUTES.customerList} className="text-brand hover:underline">
                            {inv.company}
                          </Link>
                        </Td>
                        <Td muted>{inv.customerCode}</Td>
                        <Td muted>{formatDateTimeAmPm(inv.date)}</Td>
                        <Td right muted>
                          {formatNumber(inv.qty)}
                        </Td>
                        <Td right>{formatMoney(inv.totalHT)}</Td>
                        <Td right>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${inv.statusClass === 'success' ? 'bg-success-bg text-success-fg' : inv.statusClass === 'warning' ? 'bg-warning-bg text-warning-fg' : 'bg-secondary-bg text-secondary-fg'}`}>
                            {inv.status}
                          </span>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.totalRecords > 0 && (
                  <tfoot>
                    <tr className="border-t border-border font-semibold text-text!">
                      <td colSpan={4} className="px-3 py-2">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(data.totalQty)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(data.totalHT)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {data.totalRecords > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-faint bg-white dark:bg-gray-950">
                <span>
                  {pageStart}–{pageEnd} of {data.totalRecords}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-1">
                    {page + 1} / {data.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    disabled={page >= data.totalPages - 1}
                    onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                    className="p-1 rounded-md border border-border text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// The classic margins page prints amounts to up to 4 decimals (0.8621, 13.7505) and the quantity with 2.
const marginAmount = (v: number | null | undefined) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(v ?? 0))

// Margins tab (margin/tabs/productMargins.php) - per-invoice selling vs
// buying price breakdown. No Margin Rate/Mark Rate columns: both
// DISPLAY_MARGIN_RATES and DISPLAY_MARK_RATES are unset on this install,
// matching what legacy itself shows here.
export function MarginsTab({ id }: { id: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useProductMargins(id)
  if (isLoading) return <LegacyLoadingCard label="Loading margins..." />
  if (isError && (isBackendUnavailable(error) || isBackendActionUnavailable(error))) return <BackendUnavailableCard feature="Margins" />
  if (isError) return <LegacyErrorCard title="Couldn't load margins" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  // Lines without a buying price recorded at the time of sale fall back to the
  // product's current average cost; with that at 0 the margin is the whole revenue.
  const basis = data?.costBasis
  const estimatedLines = basis ? basis.linesTotal - basis.linesWithRecordedCost : 0
  return (
    <div>
      <p className="text-sm mb-4">
        <span className="text-text-faint">Total Margin</span> <span className="text-text! font-medium">{marginAmount(data?.totals.margin ?? 0)}</span>
      </p>
      {basis && estimatedLines > 0 && (
        <p className="text-xs text-warning mb-3 flex items-center gap-1.5">
          <AlertTriangle size={13} />
          {estimatedLines} of {basis.linesTotal} lines have no buying price recorded at the time of sale; they use the current average cost ({marginAmount(basis.currentPmp)})
          {basis.currentPmp === 0 ? ', which is 0, so their margin is unknown rather than 100%.' : '.'}
        </p>
      )}
      <TabTable>
        <thead>
          <tr className="text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
            <Th>Invoice</Th>
            <Th>Company</Th>
            <Th>Customer code</Th>
            <Th>Date</Th>
            <Th right>Selling price</Th>
            <Th right>Buying price</Th>
            <Th right>Qty</Th>
            <Th right>Margin</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {!data || data.lines.length === 0 ? (
            <EmptyRow span={9} label="No margin data for this product." />
          ) : (
            // One invoice can carry the product on several lines, so the id alone is not a key.
            data.lines.map((l, i) => (
              <tr key={`${l.invoiceId}-${i}`} className="border-b border-border last:border-0">
                <Td muted>{l.ref}</Td>
                <Td>{l.customerName}</Td>
                <Td muted>{l.customerCode || '—'}</Td>
                <Td muted>{l.date}</Td>
                <Td right muted>
                  {marginAmount(l.sellingPrice)}
                </Td>
                <Td right muted>
                  {marginAmount(l.buyingPrice)}
                </Td>
                <Td right muted>
                  {l.qty.toFixed(2)}
                </Td>
                <Td right>{marginAmount(l.margin)}</Td>
                <Td muted>{l.paid === null ? '—' : l.paid ? 'Paid' : 'Unpaid'}</Td>
              </tr>
            ))
          )}
        </tbody>
        {data && data.lines.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} className="px-3 py-2 font-semibold text-text! text-right">
                Total:
              </td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{marginAmount(data.totals.sellingPrice)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{marginAmount(data.totals.buyingPrice)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{formatNumber(data.totals.qty)}</td>
              <td className="px-3 py-2 font-semibold text-text! text-right tabular-nums">{marginAmount(data.totals.margin)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </TabTable>
    </div>
  )
}
