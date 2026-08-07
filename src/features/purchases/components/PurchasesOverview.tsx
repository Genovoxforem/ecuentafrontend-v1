import { Lock, BarChart2, CalendarDays, TrendingUp, FileText, FileSignature, ShoppingCart, Truck, ArrowRightLeft, Bot, Banknote, Receipt, Calculator } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { SectionHeading, StatCard, TodayStatCard, InvoiceStatusChart, InvoiceStatusTable, TopProductsTable, fmtZMW, fmtLongDate } from '../../../shared/components/dashboard/DashboardKit'
import type { PurchasesSummary } from '../purchases.queries'

export function PurchasesOverview({ summary }: { summary: PurchasesSummary }) {
  const { stats } = summary

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Lock size={20} className="text-brand" /> Supplier billing area
      </h2>

      <SectionHeading icon={BarChart2}>Overall Statistics</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard label="Purchase Invoices" count={stats.purchaseInvoices} color="blue" icon={FileText} listPath={ROUTES.vendorInvoiceList} newPath={ROUTES.vendorInvoiceCreate} />
        <StatCard label="Supplier Proposals" count={stats.supplierProposals} color="green" icon={FileSignature} listPath={ROUTES.supplierProposalList} newPath={ROUTES.supplierProposalCreate} />
        <StatCard label="Purchase Orders" count={stats.purchaseOrders} color="amber" icon={ShoppingCart} listPath={ROUTES.purchaseOrderList} newPath={ROUTES.purchaseOrderCreate} />
        <StatCard label="Vendors" count={stats.vendors} color="blue" icon={Truck} listPath={ROUTES.vendorList} newPath={ROUTES.vendorCreate} />
        <StatCard label="Asycuda Declarations" count={stats.asycudaDeclarations} color="rose" icon={ArrowRightLeft} listPath={ROUTES.asycudaPurchase} />
        <StatCard label="Automatic Purchases" count={stats.automaticPurchases} color="indigo" icon={Bot} listPath={ROUTES.zraAutomaticPurchase} />
      </div>

      <SectionHeading icon={CalendarDays}>Today&apos;s Activity ({fmtLongDate(new Date())})</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TodayStatCard label="Purchase Amount" value={fmtZMW(summary.todaysPurchaseAmount)} caption={`${summary.todaysInvoiceCount} invoice(s)`} icon={Banknote} color="rose" />
        <TodayStatCard label="Asycuda Purchase" value={fmtZMW(summary.todaysAsycudaAmount)} caption={`${summary.todaysAsycudaInvoiceCount} asycuda invoice`} icon={Receipt} color="green" />
        <TodayStatCard
          label="Net Expense Today"
          value={fmtZMW(summary.todaysPurchaseAmount - summary.todaysAsycudaAmount)}
          caption="Purchases - Credits"
          icon={Calculator}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InvoiceStatusChart title="Supplier Invoice Chart" rows={summary.invoiceStatus} />
        <InvoiceStatusTable title="Supplier Invoice Amounts By Status" rows={summary.invoiceStatus} />
        <TopProductsTable icon={TrendingUp} title="Top Purchased Product" year={summary.topProductsYear} rows={summary.topProducts} emptyLabel="No purchases yet." />
      </div>
    </div>
  )
}
