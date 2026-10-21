import { ROUTES } from '../../routes'

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page'

// The sidebar link for a backend menu item that has no React page yet: its own
// path (not a query string) so the page banner, breadcrumb and the highlighted
// menu entry all follow the URL like any other page.
export function underConstructionPath(sectionKey: string, title: string): string {
  return ROUTES.underConstruction.replace(':section', slugify(sectionKey)).replace(':page', slugify(title))
}
