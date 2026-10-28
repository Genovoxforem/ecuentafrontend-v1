import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CustomerDiscountsModal } from '../CustomerDiscountsModal'
import { Plus } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import type { CustomerProfile } from '../../customerDetail.queries'
import { useCustomerTab, useVendorTab, type CustomerTabDocRow, type CustomerTabButton } from '../../customerDetailTabs.queries'
import { InfoRow, TabTitle } from './CustomerDetailShared'

// Keys of societe/api/customer.php's own buttons[] array (backend-driven:
// create_proposal/create_order/create_contract/create_job_card/
// bill_orders(_refused)/create_invoice/advance_list). Only keys with an
// in-app page get routed internally; everything else is rendered disabled
// instead of linking out to the legacy PHP page.
function customerActionRoute(key: string, socid: string): string | null {
  switch (key) {
    case 'create_proposal':
      return ROUTES.customerQuotationCreate.replace(':id', socid)
    case 'create_order':
      return ROUTES.customerOrderCreate.replace(':id', socid)
    case 'create_contract':
      return ROUTES.customerContractCreate.replace(':id', socid)
    case 'create_invoice':
      return ROUTES.customerInvoiceCreate.replace(':id', socid)
    case 'create_job_card':
      return ROUTES.customerJobCardCreate.replace(':id', socid)
    case 'advance_list':
      return ROUTES.customerAdvanceList.replace(':id', socid)
    default:
      return null
  }
}

function CustomerActionButton({ button, socid }: { button: CustomerTabButton; socid: string }) {
  if (button.refused) {
    return (
      <span title={button.title} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-faint opacity-60 cursor-not-allowed">
        {button.label}
      </span>
    )
  }
  const route = customerActionRoute(button.key, socid)
  if (route) {
    return (
      <Link key={button.key} to={route} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
        {button.label}
      </Link>
    )
  }
  return (
    <span
      title="No in-app page exists yet for this action."
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-faint opacity-60 cursor-not-allowed"
    >
      {button.label}
    </span>
  )
}

export function CustomerTab({ socid, profile }: { socid: string | undefined; profile: CustomerProfile }) {
  const { data, isLoading, isError, error, refetch } = useCustomerTab(socid)
  const [showDiscounts, setShowDiscounts] = useState(false)
  if (isLoading) return <LegacyLoadingCard label="Loading customer info…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load customer info" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const prospectLevelLabel = data.prospect_levels.find((p) => p.code === data.prospectlevel)?.label
  const stcommLabel = data.stcomms.find((s) => s.id === data.stcomm_id)?.label

  return (
    <div className="space-y-4">
      <TabTitle>Customer</TabTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Proposals</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.proposals_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.proposals_kpi.opened)}</p>
          <Link to={`${ROUTES.quotationList}?customerId=${socid ?? ''}`} className="text-xs font-medium text-brand hover:underline">
            View all
          </Link>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Orders</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.orders_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.orders_kpi.opened)}</p>
          <Link to={`${ROUTES.orderList}?customerId=${socid ?? ''}`} className="text-xs font-medium text-brand hover:underline">
            View all
          </Link>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Invoices</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(profile.kpiInvoice)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.outstanding.total_ht)}</p>
          <Link to={`${ROUTES.invoiceList}?customerId=${socid ?? ''}`} className="text-xs font-medium text-brand hover:underline">
            View all
          </Link>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Customer Credit / Advance</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.advance)}</p>
          <p className="text-xs text-text-faint">Discount: {data.remise_percent}%</p>
          <button type="button" onClick={() => setShowDiscounts(true)} className="self-start text-xs font-medium text-brand hover:underline">
            Manage discounts
          </button>
          {showDiscounts && socid && <CustomerDiscountsModal socid={socid} relativePercent={data.remise_percent} onClose={() => setShowDiscounts(false)} />}
        </Card>
      </div>

      <Card className="!h-auto">
        <InfoRow label="Prospect / Customer" value={data.client_label} />
        <InfoRow label="Customer Code" value={data.code_client} />
        <InfoRow label="Accounting Code" value={data.code_compta} />
        <InfoRow label="Discount %" value={data.remise_percent ? `${data.remise_percent}%` : ''} />
        <InfoRow label="Payment Terms" value={data.cond_reglement_label} />
        <InfoRow label="Payment Mode" value={data.mode_reglement_label} />
        <InfoRow label="Prospect Level" value={prospectLevelLabel} />
        <InfoRow label="Prospect Status" value={stcommLabel} />
        <InfoRow label="Sales Reps" value={data.sales_reps.join(', ')} />
        <InfoRow label="Categories" value={data.categories.join(', ')} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentDocsCard
          title="Recent proposals"
          doc={data.proposals}
          viewAllRoute={`${ROUTES.quotationList}?customerId=${socid ?? ''}`}
          createRoute={ROUTES.customerQuotationCreate.replace(':id', socid ?? '')}
        />
        <RecentDocsCard
          title="Recent orders"
          doc={data.orders}
          viewAllRoute={`${ROUTES.orderList}?customerId=${socid ?? ''}`}
          createRoute={ROUTES.customerOrderCreate.replace(':id', socid ?? '')}
        />
        <RecentDocsCard
          title="Recent invoices"
          doc={data.invoices}
          viewAllRoute={`${ROUTES.invoiceList}?customerId=${socid ?? ''}`}
          createRoute={ROUTES.customerInvoiceCreate.replace(':id', socid ?? '')}
        />
      </div>

      {/* Sticky to the tab's own scroll container (CustomerDetail's overflow-y-auto
          div, which has py-4) — -mb-4 cancels that bottom padding the same way
          the page header above cancels -m-6's p-6, so bottom-0 clamps flush
          against the true bottom of the scroll viewport instead of leaving a gap. */}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-4 border-t border-border bg-white px-0 pb-0 pt-[3px] dark:bg-gray-950">
        <div className="flex flex-wrap gap-2">
          {data.buttons
            .filter((b) => b.visible)
            .map((b) => (
              <CustomerActionButton key={b.key} button={b} socid={socid ?? ''} />
            ))}
        </div>
      </div>
    </div>
  )
}

function RecentDocsCard({
  title,
  doc,
  viewAllRoute,
  createRoute,
}: {
  title: string
  doc: { count: number; rows: CustomerTabDocRow[] }
  viewAllRoute: string
  createRoute: string
}) {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text!">{title}</h3>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-surface-hover text-text-muted text-[10px] font-semibold">{doc.count}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to={viewAllRoute} className="text-xs font-medium text-text-muted hover:text-text">
            View all
          </Link>
          <Link to={createRoute} className="flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover">
            <Plus size={12} /> New
          </Link>
        </div>
      </div>
      <div className="p-4">
        {doc.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic py-4 text-center">No records yet.</p>
        ) : (
          <ul className="space-y-2">
            {doc.rows.map((r, i) => (
              <li key={r.ref ?? i} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-text! truncate">{r.ref}</span>
                <span className="text-text-muted shrink-0">{r.total_ht !== undefined ? formatMoney(r.total_ht) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

// Native rebuild of fourn/card.php's own "VENDOR" tab, backed by the
// societe/api/supplier.php endpoint (see customerDetailTabs.queries.ts's
// VendorTabResponse comment for which fields it carries and which page
// sub-lines it doesn't expose).
export function VendorTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useVendorTab(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading vendor info…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load vendor info" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Price Requests</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.proposals_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.proposals_kpi.opened)}</p>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Orders</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.orders_kpi.total_ht)}</p>
          <p className="text-xs text-text-faint">Outstanding: {formatMoney(data.orders_kpi.opened)}</p>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Invoices</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(data.supplier_outstanding.total_ht)}</p>
          <p className="text-xs text-text-faint">Current Outstanding Bill: {formatMoney(data.supplier_outstanding.opened)}</p>
        </Card>
        <Card className="!h-auto">
          <p className="text-xs text-text-faint uppercase tracking-wide">Capital / Advance</p>
          <p className="text-lg font-bold text-text! mt-0.5">{formatMoney(Number(data.fields.capital) || 0)}</p>
          <p className="text-xs text-text-faint">Advance: {formatMoney(data.fields.advance)}</p>
        </Card>
      </div>

      <Card className="!h-auto">
        <InfoRow label="Vendor Code" value={data.code_fournisseur} />
        <InfoRow label="Vendor Accounting Code" value={data.code_compta_fournisseur} />
        <InfoRow label="VAT ID" value={data.fields.tva_intra} />
        <InfoRow label="Payment Terms" value={data.cond_reglement_label} />
        <InfoRow label="Payment Type" value={data.mode_reglement_label} />
        <InfoRow label="Relative Discount" value={data.fields.remise_percent ? `${data.fields.remise_percent}%` : ''} />
        <InfoRow label="Absolute Discount" value={data.fields.remise_absolue ? formatMoney(data.fields.remise_absolue) : ''} />
        <InfoRow label="Vendors Tags/Categories" value={data.fields.categories.join(', ')} />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          to={ROUTES.customerSupplierProposalCreate.replace(':id', socid ?? '')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Create A Price Request
        </Link>
        <Link
          to={ROUTES.customerPurchaseOrderCreate.replace(':id', socid ?? '')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Create Order
        </Link>
        <Link
          to={ROUTES.customerVendorInvoiceCreate.replace(':id', socid ?? '')}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Create Invoice Or Credit Note
        </Link>
      </div>
    </div>
  )
}
