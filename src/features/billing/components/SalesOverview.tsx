import { FolderOpen, BarChart2, CalendarDays, TrendingUp, FileText, FileSignature, ShoppingCart, FileBadge2, User, Banknote, Receipt, Calculator } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { SectionHeading, StatCard, TodayStatCard, InvoiceStatusChart, InvoiceStatusTable, TopProductsTable, fmtZMW, fmtLongDate } from '../../../shared/components/dashboard/DashboardKit'
import type { SalesSummary } from '../billing.queries'

export function SalesOverview({ summary }: { summary: SalesSummary }) {
  const { stats } = summary

  return (
    <div className="space-y-4">
      {/* Shown in the page banner (in themes without a banner it stays here, above the cards). */}
      <InBanner>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-2 text-sm font-bold text-text!">
            <FolderOpen size={16} className="text-brand" /> Customer billing area
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold text-text-muted">
            <BarChart2 size={16} className="text-brand" /> Overall Statistics
          </span>
        </div>
      </InBanner>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Sales Invoices"
          count={stats.salesInvoices}
          color="blue"
          icon={FileText}
          listPath={ROUTES.invoiceList}
          newPath={ROUTES.invoiceCreate}
          extraLink={{ label: 'Quick Invoice', path: ROUTES.invoiceCreate }}
        />
        <StatCard label="Proposals" count={stats.proposals} color="green" icon={FileSignature} listPath={ROUTES.quotationList} newPath={ROUTES.quotationCreate} />
        <StatCard label="Sales Orders" count={stats.salesOrders} color="amber" icon={ShoppingCart} listPath={ROUTES.orderList} newPath={ROUTES.orderCreate} />
        <StatCard label="Contracts" count={stats.contracts} color="blue" icon={FileBadge2} listPath={ROUTES.contractList} newPath={ROUTES.contractCreate} />
        <StatCard label="Customers" count={stats.customers} color="rose" icon={User} listPath={ROUTES.customerList} newPath={ROUTES.customersCreate} />
      </div>

      <SectionHeading icon={CalendarDays}>Today&apos;s Activity ({fmtLongDate(new Date())})</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TodayStatCard label="Invoice Amount" value={fmtZMW(summary.todaysInvoiceAmount)} caption={`${summary.todaysInvoiceCount} invoice(s)`} icon={Banknote} color="green" />
        <TodayStatCard label="Refund Amount" value={fmtZMW(summary.todaysRefundAmount)} caption={`${summary.todaysCreditNoteCount} credit note(s)`} icon={Receipt} color="rose" />
        <TodayStatCard
          label="Net Today"
          value={fmtZMW(summary.todaysInvoiceAmount - summary.todaysRefundAmount)}
          caption="Invoices - Refunds"
          icon={Calculator}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InvoiceStatusChart title="Invoice Status Chart" rows={summary.invoiceStatus} />
        <InvoiceStatusTable title="Invoice Amounts By Status" rows={summary.invoiceStatus} />
        <TopProductsTable icon={TrendingUp} title="Top Sold Product's" year={summary.topProductsYear} rows={summary.topProducts} emptyLabel="No sales yet." />
      </div>
    </div>
  )
}
