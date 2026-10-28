import { Card } from '../../../shared/components/dashboard/DashboardKit'
import type { Tab } from './ProductDetailShared'
import { EventsTab, LinkedFilesTab, NotesTab } from './productDetailTabs/notesFilesEventsTabs'
import { BuyingPricesTab, SellingPricesTab } from './productDetailTabs/pricingTabs'
import { InvoiceStatsTab, MarginsTab, StatisticsTab } from './productDetailTabs/statsTabs'
import { StockTab } from './productDetailTabs/stockTab'
import { UomSettingsTab } from './productDetailTabs/uomTab'
import { AssociatedProductsTab, ProductCombinationsTab } from './productDetailTabs/variantTabs'
export { ProductStockActionModal } from './productDetailTabs/stockTab'

type LazyTabRendererProps = {
  tab: Tab
  id: string | undefined
}

export function LazyTabRenderer({ tab, id }: LazyTabRendererProps) {
  switch (tab) {
    case 'Selling Prices':
      return <SellingPricesTab id={id} />
    case 'Supplier Prices':
      return <BuyingPricesTab id={id} />
    case 'Stock':
      return <StockTab id={id} />
    case 'UOM':
      return <UomSettingsTab id={id} />
    case 'Variants':
      return <ProductCombinationsTab id={id} />
    case 'Composition':
      return <AssociatedProductsTab id={id} />
    case 'Statistics':
      return <StatisticsTab id={id} />
    case 'Invoice Stats':
      return <InvoiceStatsTab id={id} />
    case 'Notes':
      return <NotesTab id={id} />
    case 'Documents':
      return <LinkedFilesTab id={id} />
    case 'Events':
      return <EventsTab id={id} />
    case 'Margins':
      return (
        <Card className="!h-auto">
          <MarginsTab id={id} />
        </Card>
      )
    default:
      return null
  }
}
