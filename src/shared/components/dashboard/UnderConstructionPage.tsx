import { PageNotAvailable } from '../PageNotAvailable'

// A backend menu item with no React page yet (see shared/nav/underConstruction.ts).
// The item's name is in the page banner and breadcrumb, so it is not repeated here.
export function UnderConstructionPage() {
  return <PageNotAvailable />
}
