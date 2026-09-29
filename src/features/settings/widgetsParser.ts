// Parses admin/boxes.php (Setup > Widgets) — the page that lists the available
// widgets ("boxes"), the activated ones with their order, and two settings.
// Verified against the dev backend and the page's own PHP:
//   - available rows carry a `select[name="boxid[<id>][pos]"]` (the page to activate
//     on) and a hidden `boxid[<id>][value]`;
//   - activated rows carry the delete link `boxes.php?rowid=<rowid>&action=delete&token=…`
//     and the reorder links `action=switch&switchfrom=<rowid>&switchto=<rowid>`;
//   - the settings form posts MAIN_BOXES_MAXLINES (and MAIN_ACTIVATE_FILECACHE, which
//     the page only shows in some installs).
// The page's markup is loose (e.g. an unterminated class attribute on the blank
// position option), so everything is looked up on the document by name.

export interface WidgetPosition {
  value: string
  label: string
}

export interface AvailableWidget {
  boxId: string
  label: string
  note: string
  sourceFile: string
}

export interface ActivatedWidget {
  rowId: string
  label: string
  note: string
  position: string
  order: number
}

export interface WidgetsPage {
  token: string
  positions: WidgetPosition[]
  available: AvailableWidget[]
  activated: ActivatedWidget[]
  maxLines: string
  // null when this install's page doesn't offer the setting.
  fileCache: string | null
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseWidgetsPage(doc: Document): WidgetsPage {
  const token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!token) throw new Error('The widgets on this backend page were not recognised.')

  const posSelects = Array.from(doc.querySelectorAll<HTMLSelectElement>('select')).filter((s) => /^boxid\[\d+\]\[pos\]$/.test(s.getAttribute('name') ?? ''))
  const positions: WidgetPosition[] = Array.from(posSelects[0]?.options ?? [])
    .filter((o) => o.value.trim() !== '' && o.value !== '-1')
    .map((o) => ({ value: o.value, label: clean(o.textContent) }))

  const available: AvailableWidget[] = posSelects.map((s) => {
    const cells = Array.from(s.closest('tr')?.querySelectorAll(':scope > td') ?? [])
    return {
      boxId: s.getAttribute('name')?.match(/boxid\[(\d+)\]/)?.[1] ?? '',
      label: clean(cells[0]?.textContent),
      note: clean(cells[1]?.textContent),
      sourceFile: clean(cells[2]?.textContent),
    }
  })

  const activated: ActivatedWidget[] = []
  const seen = new Set<string>()
  doc.querySelectorAll<HTMLAnchorElement>('a[href*="action=delete"][href*="rowid="]').forEach((a) => {
    const rowId = a.getAttribute('href')?.match(/[?&]rowid=(\d+)/)?.[1]
    const tr = a.closest('tr')
    if (!rowId || !tr || seen.has(rowId)) return
    seen.add(rowId)
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    activated.push({
      rowId,
      label: clean(cells[0]?.textContent),
      note: clean(cells[1]?.textContent),
      position: clean(cells[2]?.textContent),
      order: Number(clean(cells[3]?.textContent)) || activated.length + 1,
    })
  })

  const fileCache = doc.querySelector<HTMLSelectElement>('select[name="MAIN_ACTIVATE_FILECACHE"]')
  return {
    token,
    positions,
    available,
    activated,
    maxLines: doc.querySelector<HTMLInputElement>('input[name="MAIN_BOXES_MAXLINES"]')?.getAttribute('value') ?? '',
    fileCache: fileCache ? (Array.from(fileCache.options).find((o) => o.hasAttribute('selected'))?.value ?? '0') : null,
  }
}
