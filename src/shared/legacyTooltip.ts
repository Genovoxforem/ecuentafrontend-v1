// The classic lists' hover card: a link's data-geo attribute holds the tooltip markup the backend prints
// (.ec-tooltip-header with an avatar, a title and status badges; .ec-tooltip-body with a list of lines, label / value pairs
// for li.splitequal). It is read here into plain data so React draws it itself — the markup is never injected.

export interface LegacyTooltipLine {
  // "Date:", "Customer Code:" — empty for a plain line ("Customer", "Country: ZM").
  label: string
  value: string
}

export interface LegacyTooltip {
  // The kind of object as the card's own first line says it ("Invoice", "Customer", "User", "CreditNote").
  kind: string
  initials: string
  title: string
  badges: Array<{ text: string; status: number | null }>
  lines: LegacyTooltipLine[]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

export function parseLegacyTooltip(html: string | null | undefined): LegacyTooltip | null {
  if (!html || !html.includes('ec-tooltip')) return null
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const title = clean(body.querySelector('.ec-tooltip-title')?.textContent)
  if (!title) return null
  const kindEl = Array.from(body.querySelectorAll('u.paddingrightonly')).find((u) => clean(u.textContent))
  const badges = Array.from(body.querySelectorAll('.ec-tooltip-header .badge'))
    .map((b) => ({ text: clean(b.textContent), status: Number(/badge-status(\d+)/.exec(b.className)?.[1] ?? NaN) }))
    .filter((b) => b.text)
    .map((b) => ({ text: b.text, status: Number.isNaN(b.status) ? null : b.status }))
  const lines: LegacyTooltipLine[] = []
  for (const li of Array.from(body.querySelectorAll('.ec-tooltip-list > li'))) {
    if (li.querySelector('u.paddingrightonly')) continue // the kind line, shown as `kind`
    const spans = li.classList.contains('splitequal') ? Array.from(li.children) : []
    if (spans.length >= 2) {
      lines.push({ label: clean(spans[0].textContent), value: clean(spans.slice(1).map((s) => s.textContent).join(' ')) })
      continue
    }
    const text = clean(li.textContent)
    if (text && text.length > 1) lines.push({ label: '', value: text })
  }
  return { kind: clean(kindEl?.textContent), initials: clean(body.querySelector('.ec-tooltip-header .avatar')?.textContent), title, badges, lines }
}

// The tooltip of a cell: the data-geo of its first link (or of the cell itself).
export function cellTooltip(cellHtml: string | null | undefined): LegacyTooltip | null {
  if (!cellHtml) return null
  const body = new DOMParser().parseFromString(cellHtml, 'text/html').body
  const holder = body.querySelector('[data-geo]')
  return parseLegacyTooltip(holder?.getAttribute('data-geo'))
}

// A label / value line of a tooltip ("Customer Code:" -> "CU2412-00001").
export function tooltipValue(tip: LegacyTooltip | null, label: RegExp): string {
  return tip?.lines.find((l) => label.test(l.label))?.value ?? ''
}
