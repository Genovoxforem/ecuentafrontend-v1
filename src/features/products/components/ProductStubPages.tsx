import { Tag, Tags } from 'lucide-react'
import { NotBuiltPage } from '../../../shared/components/dashboard/NotBuiltPage'

// Honest "not built yet" landings for nav items that have no backend
// endpoint on this app's server yet — see NotBuiltPage.tsx. Wiring these to
// real routes (instead of no <Route> at all) fixes the previous silent
// bounce-to-/dashboard behavior. (Stocks/StocksByLot/LotsSerials/
// VariantAttributes moved out to their own real, live-data components —
// see ProductStocksPage.tsx etc.)
export function ProductPriceListPage() {
  return <NotBuiltPage icon={Tag} title="Bulk Price Update" description="Mass price editing across products. No such endpoint exists on this backend yet." />
}

export function ProductTagsPage() {
  return <NotBuiltPage icon={Tags} title="Product/Service Tags & Categories" description="Tag/category management. No dedicated management endpoint exists on this backend yet (categories can only be picked, not managed, from the create form)." />
}
