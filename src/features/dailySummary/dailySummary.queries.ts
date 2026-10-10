import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'

export interface DailySummaryCell {
  text: string
  end: boolean
  colSpan: number
}
export interface DailySummaryRow {
  cells: DailySummaryCell[]
  total: boolean
}
export interface DailySummaryTable {
  headers: DailySummaryCell[]
  rows: DailySummaryRow[]
  // True for the two P&L tables the classic page lays out side by side.
  side: boolean
  // The "Net Profit" line is drawn as a one-row table of its own.
  highlight: boolean
}
export interface DailySummarySection {
  title: string
  tables: DailySummaryTable[]
}
export interface DailySummaryData {
  title: string
  company: string
  date: string
  sections: DailySummarySection[]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

function parseCell(el: Element): DailySummaryCell {
  return { text: clean(el.textContent), end: el.classList.contains('text-end'), colSpan: Number(el.getAttribute('colspan')) || 1 }
}

// The classic page prints the summary server-side into the home page's right-hand
// offcanvas (#summary); there is no JSON endpoint, so it is read from that block.
export function parseDailySummary(doc: Document): DailySummaryData | null {
  const root = doc.querySelector('#summary')
  if (!root) return null
  const heads = Array.from(root.querySelectorAll('.headtitle1')).map((h) => clean(h.textContent))
  const sections: DailySummarySection[] = []
  for (const sec of Array.from(root.querySelectorAll('.section'))) {
    const title = clean(sec.querySelector('.section-title')?.textContent)
    const tables: DailySummaryTable[] = Array.from(sec.querySelectorAll('table')).map((t) => ({
      headers: Array.from(t.querySelectorAll('thead th')).map(parseCell),
      rows: Array.from(t.querySelectorAll('tbody tr')).map((tr) => ({
        cells: Array.from(tr.children).map(parseCell),
        total: tr.classList.contains('total-row') || tr.classList.contains('profit-row'),
      })),
      side: !!t.closest('.col-md-6'),
      highlight: !!t.querySelector('.profit-row'),
    }))
    sections.push({ title, tables })
  }
  return {
    title: clean(root.querySelector('.headtitle')?.textContent) || 'Daily Summary',
    company: (heads.find((h) => /^Company Name/i.test(h)) ?? '').replace(/^Company Name\s*:\s*/i, ''),
    date: (heads.find((h) => /^Date/i.test(h)) ?? '').replace(/^Date\s*:\s*/i, ''),
    sections,
  }
}

export function useDailySummary(enabled = true) {
  return useQuery({
    queryKey: ['daily-summary'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/index.php?mainmenu=home')
      const data = parseDailySummary(doc)
      if (!data) throw new Error('The daily summary was not found on the backend page.')
      return data
    },
  })
}
