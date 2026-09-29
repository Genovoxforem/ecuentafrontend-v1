// Parses notification_ajax_modern.php's `action=getnoti` response — the HTML the
// legacy navbar bell drops into its panel.
//
// What is verified against the real backend: the empty response
// (`<div class="notifi-empty">…No Notifications…</div>`), the count endpoint and
// the request shapes. Neither dev backend has a notification to look at, so the
// markup of a populated list is read from the classes the legacy page's OWN
// script binds to — each item is a `.listno` carrying `data-id` and `data-type`,
// gets `.unread` while unread, and has `.notifi-action-btn` buttons (mark / close)
// that are not part of its text. The item's wording is taken as its plain text,
// so an unfamiliar inner layout still shows what the backend said.

export interface NotificationItem {
  id: string
  type: string
  unread: boolean
  text: string
  // The first link inside the item, as the backend wrote it (resolve it with
  // resolveLegacyRoute before using it — never link a backend page directly).
  href: string | null
}

export function parseNotificationItems(html: string): NotificationItem[] {
  const body = new DOMParser().parseFromString(html ?? '', 'text/html').body
  return Array.from(body.querySelectorAll('.listno')).map((el, index) => {
    const clone = el.cloneNode(true) as Element
    clone.querySelectorAll('.notifi-action-btn, script, style').forEach((n) => n.remove())
    return {
      id: el.getAttribute('data-id') ?? String(index),
      type: el.getAttribute('data-type') ?? '',
      unread: el.classList.contains('unread'),
      text: (clone.textContent ?? '').replace(/\s+/g, ' ').trim(),
      href: el.querySelector('a[href]')?.getAttribute('href') ?? null,
    }
  })
}
