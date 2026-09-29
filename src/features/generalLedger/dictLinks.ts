// Links on Dolibarr dictionary pages (admin/dict.php). Verified in the page's PHP (dict.php):
//   - a row's status link is `action=activate` (when the row is off) or `action=disable`;
//   - a row's delete link is `action=delete`, which only PRINTS the "are you sure?" box;
//     the deletion itself is `action=confirm_delete&confirm=yes` on the same URL.

// The request that actually deletes, from the row's own `action=delete` link.
export function dictConfirmDeleteUrl(deleteUrl: string): string {
  if (!/[?&]action=delete(?:&|$)/.test(deleteUrl)) throw new Error('This entry has no delete link.')
  return deleteUrl.replace(/([?&])action=delete(?=&|$)/, '$1action=confirm_delete&confirm=yes')
}

// Root-relative form of an href (some builds print absolute URLs).
export function dictRelativeHref(href: string | null | undefined): string | null {
  if (!href) return null
  if (!href.startsWith('http')) return href
  const url = new URL(href)
  return url.pathname + url.search
}
