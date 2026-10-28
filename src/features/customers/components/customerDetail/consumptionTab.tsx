import { Link } from 'react-router-dom'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useCustomerConsumption } from '../../customerDetailTabs.queries'
import { TabTitle } from './CustomerDetailShared'

const CONSUMPTION_SECTIONS = ['propals', 'orders', 'invoices', 'interventions', 'supplier_orders', 'supplier_invoices'] as const

type ConsumptionSectionKey = (typeof CONSUMPTION_SECTIONS)[number]

// In-app List page per section, customer-scoped via the ?customerId= filter
// added to each list (see QuotationsList.tsx/OrdersList.tsx/InvoicesList.tsx/
// PurchaseOrdersList.tsx/VendorInvoiceListPage.tsx). "interventions" has no
// real customer-filtered list page — fichinter's own real DataTables sidebar
// endpoint (jobcard-sidebar-list-ajax.php) never selects fk_soc, so there's
// no way to scope it — omitted rather than linking to an unfiltered page.
function consumptionListRoute(key: ConsumptionSectionKey, socid: string): string | null {
  switch (key) {
    case 'propals':
      return `${ROUTES.quotationList}?customerId=${socid}`
    case 'orders':
      return `${ROUTES.orderList}?customerId=${socid}`
    case 'invoices':
      return `${ROUTES.invoiceList}?customerId=${socid}`
    case 'supplier_orders':
      return `${ROUTES.purchaseOrderList}?customerId=${socid}`
    case 'supplier_invoices':
      return `${ROUTES.vendorInvoiceList}?customerId=${socid}`
    case 'interventions':
      return null
  }
}

// Real per-row detail route. row.id is already a plain real numeric id
// (societe/api/consumption.php's own rowid, not parsed from a link) — no
// detail route exists yet for supplier_invoices or interventions (confirmed
// while auditing this tab), so those stay plain text instead of a link.
function consumptionDetailRoute(key: ConsumptionSectionKey, id: number): string | null {
  switch (key) {
    case 'propals':
      return ROUTES.quotationDetail.replace(':id', String(id))
    case 'orders':
      return ROUTES.orderDetail.replace(':id', String(id))
    case 'invoices':
      return ROUTES.invoiceDetail.replace(':id', String(id))
    case 'supplier_orders':
      return ROUTES.purchaseOrderDetail.replace(':id', String(id))
    case 'supplier_invoices':
    case 'interventions':
      return null
  }
}

// societe/api/consumption.php — real per-table counts/rows (propal/
// commande/facture/fichinter, or the supplier-side tables for a vendor),
// confirmed by reading that file directly. Read-only; "Open list"/"All"/
// per-row links now route in-app instead of out to the legacy backend.
export function ConsumptionTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerConsumption(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading consumption…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load consumption" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // section_labels always lists all 6 possible sections (a static map on the
  // backend); only the ones relevant to this record's client/supplier type
  // are actually populated in summary/sections — filter on that instead, or
  // every customer record would also show empty Supplier orders/Supplier
  // invoices cards the real page never displays for them.
  const sectionKeys = CONSUMPTION_SECTIONS.filter((k) => k in data.summary)

  return (
    <div className="space-y-3">
      <TabTitle>Consumption</TabTitle>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${sectionKeys.length > 4 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {sectionKeys.map((key) => {
          const listRoute = socid ? consumptionListRoute(key, socid) : null
          return (
            <Card key={key} className="!h-auto">
              <p className="text-xs text-text-faint uppercase tracking-wide">{data.section_labels[key]}</p>
              <p className="text-lg font-bold text-text! mt-0.5">{data.summary[key] ?? 0}</p>
              {listRoute ? (
                <Link to={listRoute} className="text-xs font-medium text-brand hover:underline">
                  Open list
                </Link>
              ) : (
                <span className="text-xs font-medium text-text-faint">No filtered list available</span>
              )}
            </Card>
          )
        })}
      </div>
      {sectionKeys.map((key) => {
        const listRoute = socid ? consumptionListRoute(key, socid) : null
        return (
          <Card key={key} className="!h-auto !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-text!">{data.section_labels[key]}</h3>
              {listRoute && (
                <Link to={listRoute} className="px-2.5 py-1 rounded-md border border-border text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text">
                  All
                </Link>
              )}
            </div>
            <div className="p-4">
              {(data.sections[key] ?? []).length === 0 ? (
                <p className="text-sm text-text-faint italic text-center py-2">No recent rows.</p>
              ) : (
                <ul className="space-y-2">
                  {data.sections[key].map((row) => {
                    const detailRoute = consumptionDetailRoute(key, row.id)
                    return (
                      <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                        {detailRoute ? (
                          <Link to={detailRoute} className="font-medium text-brand hover:underline truncate">
                            {row.ref}
                          </Link>
                        ) : (
                          <span className="font-medium text-text! truncate">{row.ref}</span>
                        )}
                        <span className="text-text-muted shrink-0 flex items-center gap-3">
                          <span>{row.date}</span>
                          {row.total > 0 && <span>{formatMoney(row.total)}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
