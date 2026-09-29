import type { MonthlyStats } from './orderStats.queries'

// The classic statistics pages — commande/stats/index.php (customer orders),
// comm/propal/stats/index.php (quotations) and commande/stats/index.php?mode=
// supplier (purchase orders) — share one layout, confirmed live on 172.16.5.10
// and 172.16.5.55 (where purchase orders hold real data: 2026 = 4 orders /
// 985 total): a filter form, a yearly summary table (Year / Number of … / % /
// Total amount / % / Average amount / %) and three Chart.js charts whose
// inline scripts carry the monthly figures as `label: 'YYYY' … data: [12 numbers]`
// per year (script ids …nbinyear…, …amountinyear…, …average…). The pages never
// run those scripts here — the numbers are read straight from their text.
function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const num = (s: string) => Number(s.replace(/[^0-9.-]/g, '')) || 0

// { '2025': [12 numbers], '2026': [12 numbers] } from one chart script.
function series(doc: Document, idPart: string): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const script of Array.from(doc.querySelectorAll('script[id]'))) {
    if (!(script.getAttribute('id') ?? '').includes(idPart)) continue
    const src = script.textContent ?? ''
    for (const m of src.matchAll(/label:\s*'(\d{4})'[^{}]*?data:\s*\[([^\]]*)\]/g)) {
      out[m[1]] = m[2].split(',').map((v) => Number(v.trim()) || 0)
    }
    break
  }
  return out
}

export function parseLegacyStats(doc: Document, year: number): MonthlyStats {
  const countByMonth = series(doc, 'nbinyear')
  const amountByMonth = series(doc, 'amountinyear')

  // Yearly summary row for the selected year, columns found by header text.
  const table = Array.from(doc.querySelectorAll('table')).find((t) => !t.querySelector('table') && /^Year\b/i.test(text(t.querySelector('tr'))))
  const heads = Array.from(table?.querySelector('tr')?.children ?? []).map((c) => text(c).toLowerCase())
  const idx = { count: heads.findIndex((h) => /^number/.test(h)), total: heads.findIndex((h) => /^total amount/.test(h)), avg: heads.findIndex((h) => /^average/.test(h)) }
  const row = Array.from(table?.querySelectorAll('tr') ?? []).find((tr) => text(tr.children[0]) === String(year))

  const monthCounts = countByMonth[String(year)] ?? []
  const monthAmounts = amountByMonth[String(year)] ?? []
  const count = row && idx.count >= 0 ? num(text(row.children[idx.count])) : monthCounts.reduce((a, b) => a + b, 0)
  const totalAmount = row && idx.total >= 0 ? num(text(row.children[idx.total])) : monthAmounts.reduce((a, b) => a + b, 0)
  const averageAmount = row && idx.avg >= 0 ? num(text(row.children[idx.avg])) : count ? totalAmount / count : 0

  return { year, countByMonth, amountByMonth, summary: { count, totalAmount, averageAmount } }
}
