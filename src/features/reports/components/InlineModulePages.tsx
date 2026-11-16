import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { ROUTES } from '../../../routes'
import { RouteFallback } from '../../../shared/components/RouteFallback'

// Reports whose data is the same as a page another module already has (same API): they open INSIDE the Reports Center (the address stays /reports/...
// and the sidebar stays on Reports) instead of redirecting to that module's route.
const page = (load: () => Promise<Record<string, ComponentType>>, name: string): LazyExoticComponent<ComponentType> => lazy(() => load().then((m) => ({ default: m[name] })))

const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  [ROUTES.vendorPaymentsList]: page(() => import('../../../modules/purchases/VendorPaymentsListModule'), 'VendorPaymentsListModule'),
  [ROUTES.vendorPaymentsReport]: page(() => import('../../../modules/purchases/VendorPaymentsReportModule'), 'VendorPaymentsReportModule'),
  [ROUTES.paymentsList]: page(() => import('../../../modules/invoices/PaymentsListModule'), 'PaymentsListModule'),
  [ROUTES.ledgerForeignCurrencyRevaluation]: page(() => import('../../../modules/ledger/ForeignCurrencyRevaluationModule'), 'ForeignCurrencyRevaluationModule'),
  [ROUTES.ledgerSpecialPaymentsArea]: page(() => import('../../../modules/ledger/SpecialPaymentsAreaModule'), 'SpecialPaymentsAreaModule'),
  [ROUTES.ledgerSocialFiscalTaxesList]: page(() => import('../../../modules/ledger/SocialFiscalTaxesListModule'), 'SocialFiscalTaxesListModule'),
  [ROUTES.ledgerSocialFiscalTaxPayments]: page(() => import('../../../modules/ledger/SocialFiscalTaxPaymentsModule'), 'SocialFiscalTaxPaymentsModule'),
  [ROUTES.ledgerSalesTaxList]: page(() => import('../../../modules/ledger/SalesTaxListModule'), 'SalesTaxListModule'),
  [ROUTES.ledgerVatReportByMonth]: page(() => import('../../../modules/ledger/VatReportByMonthModule'), 'VatReportByMonthModule'),
  [ROUTES.ledgerVatReportByCustomer]: page(() => import('../../../modules/ledger/VatReportByCustomerModule'), 'VatReportByCustomerModule'),
  [ROUTES.ledgerVatReportByRate]: page(() => import('../../../modules/ledger/VatReportByRateModule'), 'VatReportByRateModule'),
}

export function hasInlinePage(route: string | undefined): boolean {
  return !!route && route in PAGES
}

export function InlineModulePage({ route }: { route: string }) {
  const Page = PAGES[route]
  return (
    <Suspense fallback={<RouteFallback />}>
      <Page />
    </Suspense>
  )
}
