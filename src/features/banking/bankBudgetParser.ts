// compta/bank/budget.php — no JSON API (confirmed live), a plain read-only
// report table (Tag/Category breakdown of every bank entry's debit/credit,
// grouped by transaction tag). Scraped the same way as line.php/categ.php in
// this module.
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface BankBudgetRow {
  category: string
  count: string
  total: string
  average: string
}

export interface BankBudget {
  rows: BankBudgetRow[]
  // No total shown for the Nb column on the real page's own totals row
  // (just Total/Average) — see the parser's own comment below.
  totalTotal: string
  totalAverage: string
}

// The real table has exactly one confirmed shape live: header row
// (liste_titreRemoved) + a totals row (totalRow) with zero category rows —
// this account has no tagged entries yet. That totals row is only 3 <td>s
// (`<td colspan="2">Total</td><td class="liste_total right">0.00</td><td
// colspan="2" class="liste_total right">0.00</td>` — the real page's own
// colspans don't sum to the header's 4 columns, a quirk in its own markup,
// not a parsing bug here), so there's no separate Nb total, only Total and
// Average. Per-category row cells aren't confirmed against a populated
// example; inferred from the header's own 4-column order (Tag/Category, Nb,
// Total, Average) since that's the only shape a normal row under it could
// take.
export function parseBankBudgetPage(html: string): BankBudget {
  const tableStart = html.indexOf('liste_titreRemoved')
  const tableEnd = html.indexOf('</table>', tableStart)
  const body = tableStart >= 0 ? html.slice(tableStart, tableEnd > -1 ? tableEnd : undefined) : ''

  const totalMatch = body.match(/class="totalRow">([\s\S]*?)<\/tr>/)
  const totalCells = totalMatch ? Array.from(totalMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m) => stripTags(m[1])) : []

  const dataSection = totalMatch ? body.slice(body.indexOf('</tr>') + '</tr>'.length, totalMatch.index) : ''
  const rows: BankBudgetRow[] = []
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(dataSection))) {
    const cells = Array.from(m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((c) => stripTags(c[1]))
    if (cells.length < 4) continue
    const [category, count, total, average] = cells
    rows.push({ category, count, total, average })
  }

  return {
    rows,
    totalTotal: totalCells[1] ?? '0.00',
    totalAverage: totalCells[2] ?? '0.00',
  }
}
