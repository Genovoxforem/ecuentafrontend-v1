import { CategoriesPage } from '../../features/customers/components/CategoriesPage'

// type=1 — Dolibarr's Categorie::TYPE_SUPPLIER, matching how the legacy
// "Vendors tags/categories area" is reached (categories/index.php?type=1).
// Same real api/categories/ endpoint + component Customer/Contact Tags use.
export function VendorTagsModule() {
  return <CategoriesPage type={1} title="Vendors tags/categories area" />
}
