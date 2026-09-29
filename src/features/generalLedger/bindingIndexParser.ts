import { cellText } from './legacyTable'

// accountancy/{customer,supplier,expensereport}/index.php — the "binding" overviews. From the pages'
// own PHP and live markup (customer, 172.16.5.10):
//   - the year is in the title (`?year=`); an info box explains the binding, with bold phrases and
//     line breaks;
//   - sections follow one another: a title bar (`.ecnta-title`) and the table(s) under it. The first
//     section's title bar holds the "Bind Automatically" link — a GET `?action=validatehistory&token=…
//     &year=…` that binds, in one go, every line whose product has an accounting account;
//   - the tables are months × amounts (Account | Label | Jan … Dec | Total, or a label | Jan … Dec |
//     Total for "Other information"); a label cell can hold a link (the "Lines to bind" list).

// A run of text in a cell or the info box, optionally bold or a link (root-relative as printed).
export interface BindingSegment {
  text: string
  bold?: boolean
  href?: string
}

export interface BindingCell {
  segments: BindingSegment[]
  text: string
  bold: boolean
}

export interface BindingTable {
  headers: string[]
  rows: BindingCell[][]
}

export interface BindingSection {
  title: string
  // "Bind Automatically" and its link (carries the token), when the section has one.
  action: { label: string; href: string } | null
  tables: BindingTable[]
}

export interface BindingIndex {
  year: number
  // The info box, one entry per line.
  info: BindingSegment[][]
  sections: BindingSection[]
}

function segmentsOf(el: Element | undefined): BindingSegment[][] {
  const lines: BindingSegment[][] = [[]]
  const walk = (node: Node, bold: boolean, href?: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ')
      if (text.trim() !== '') lines[lines.length - 1].push({ text, bold: bold || undefined, href })
      return
    }
    if (!(node instanceof Element) || /^(script|style)$/i.test(node.tagName)) return
    if (node.tagName === 'BR') {
      lines.push([])
      return
    }
    const isBold = bold || /^(b|strong)$/i.test(node.tagName)
    const link = node.tagName === 'A' ? (node.getAttribute('href') ?? undefined) : href
    node.childNodes.forEach((child) => walk(child, isBold, link))
  }
  if (el) el.childNodes.forEach((child) => walk(child, false))
  return lines.filter((l) => l.length > 0)
}

function readCell(td: Element): BindingCell {
  const segments = segmentsOf(td).flat()
  return { segments, text: cellText(td), bold: !!td.querySelector('b, strong') }
}

export function readBindingIndex(doc: Document): BindingIndex {
  // (the app shell has containers of its own; the page's is the one holding the title bars)
  const container = Array.from(doc.querySelectorAll('.container-fluid')).find((c) => c.querySelector(':scope > .ecnta-title'))
  if (!container) throw new Error('The binding overview on this backend page was not recognised.')

  const sections: BindingSection[] = []
  for (const el of Array.from(container.children)) {
    if (el.classList.contains('ecnta-title')) {
      const button = el.querySelector('.ec-title-btn-container a[href]')
      sections.push({ title: cellText(el.querySelector('.titlewithicon')), action: button ? { label: cellText(button), href: button.getAttribute('href') ?? '' } : null, tables: [] })
    } else if (el.querySelector('table')) {
      const table = el.querySelector('table')
      const rows = Array.from(table?.querySelectorAll('tr') ?? [])
      const headerRow = rows.find((r) => r.classList.contains('tbold')) ?? rows[0]
      sections[sections.length - 1]?.tables.push({
        headers: Array.from(headerRow?.children ?? [], (c) => cellText(c)),
        rows: rows.filter((r) => r !== headerRow).map((r) => Array.from(r.children, (c) => readCell(c))),
      })
    }
  }

  return {
    year: Number(/Year\s+(\d{4})/.exec(cellText(doc.querySelector('.ecnta-title .titlewithicon')))?.[1]) || new Date().getFullYear(),
    info: segmentsOf(container.querySelector('.alert-info') ?? undefined),
    // The first title bar is the page title itself (it has no table).
    sections: sections.filter((s) => s.tables.length > 0),
  }
}
