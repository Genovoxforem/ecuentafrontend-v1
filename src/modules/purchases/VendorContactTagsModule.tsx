import { CategoriesPage } from '../../features/customers/components/CategoriesPage'

// type=4 — Dolibarr's contact category type isn't split by customer/vendor
// (llx_categorie has no such flag for type=4), so this is the same real
// api/categories/?type=4 collection the Customer "Contact tags and
// categories" page uses. Matches the legacy page's own heading exactly.
export function VendorContactTagsModule() {
  return <CategoriesPage type={4} title="Contacts tags/categories area" />
}
