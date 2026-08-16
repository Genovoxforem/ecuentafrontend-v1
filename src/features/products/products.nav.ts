import { Box } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Products" left menu (llx_menu, mainmenu=productinformation).
export const nav: NavSection = {
  key: 'products',
  label: 'Products',
  icon: Box,
  items: [
    {
      label: 'Products',
      items: [
        { label: 'Product Area', path: ROUTES.productArea },
        { label: 'New Product', path: ROUTES.productCreate },
        { label: 'Product List', path: ROUTES.productList },
        { label: 'Stocks', path: ROUTES.productStocks },
        { label: 'Stocks By Lot/Serial', path: ROUTES.productStocksByLot },
        { label: 'Lots/Serials', path: ROUTES.lotsSerials },
        { label: 'Variant Attributes', path: ROUTES.variantAttributes },
        { label: 'Product Statistics', path: ROUTES.productStats },
      ],
    },
    {
      label: 'Services',
      items: [
        { label: 'Services Area', path: ROUTES.productArea },
        { label: 'New Service', path: ROUTES.serviceCreate },
        { label: 'Service List', path: ROUTES.serviceList },
        { label: 'Service Statistics', path: ROUTES.serviceStats },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Import Products', path: ROUTES.productImport },
        { label: 'Product/Service-Categories', path: ROUTES.productTags },
        { label: 'Global VAT Update', path: ROUTES.productVatUpdate },
        { label: 'Bulk Price Update', path: ROUTES.productPriceList },
      ],
    },
  ],
}
