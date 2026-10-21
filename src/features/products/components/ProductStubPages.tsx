import { CategoriesPage } from '../../customers/components/CategoriesPage'
import { ProductImportWizard } from './ProductImportWizard'

// categories/index.php?type=product — the shared tags/categories page over
// categories/api/index.php (tree with stats, tagged products, create), plus edit
// and delete through product/fapi/categories.php.
export function ProductTagsPage() {
  return <CategoriesPage type={0} title="Products/Services tags/categories area" />
}

// product/product_import_wizard.php — see ProductImportWizard.tsx.
export function ProductImportPage() {
  return <ProductImportWizard />
}
