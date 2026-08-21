// Parses Dolibarr's legacy dictionary admin pages (admin/dict.php?id=N)
// client-side — no REST endpoint exists for these on this backend
// (/customers/lookups/ is a confirmed 404, see thirdPartyOptions.queries.ts),
// only these PHP-rendered list pages, same pattern already used for the
// Ledger/Journals reports (see ledgerHtmlParser.ts). The id-to-dictionary
// mapping and row structure below were discovered by logging in and reading
// admin/dict.php's own index page (its real, self-rendered links), then
// fetching each target page directly and inspecting the actual returned
// rows — not guessed:
//   id=9  Currencies            rows: [code, name, symbol, ...]
//   id=8  Third-party types     rows: [code, label, ...]
//   id=19 Number of employees   rows: [code, label, ...]
// Every real data row uses Dolibarr's standard "oddeven" list-row class
// (confirmed present — 249 matches on a single dict.php page during
// verification), with the header/filter row separately marked "liste_titre".
// (Business entity types, id=1/llx_c_forme_juridique, was checked too but
// has zero rows for Zambia specifically — filtered with
// search_country_id=243 it returns none — so it's deliberately not wired
// here; showing 250+ irrelevant countries' legal forms would be worse than
// the honest "not available" state it's already in.)

export const DICTIONARY_IDS = {
  currencies: 9,
  thirdPartyTypes: 8,
  workforce: 19,
} as const

export interface DictionaryOption {
  value: string
  label: string
}

function cellText(cell: Element | undefined): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// Shared shape across all three dictionaries: [code/id, label, ...rest] per
// row, rest being the always-icon-only Active/Edit columns this app has no
// use for. The one code value that's never a real option is Dolibarr's own
// "-" placeholder row (typent's TE_UNKNOWN, effectif's EF0) — skipped so
// the dropdown doesn't start with a meaningless dash.
function parseTwoColumnDictionary(doc: Document): DictionaryOption[] {
  const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
  const options: DictionaryOption[] = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    const value = cellText(cells[0])
    const label = cellText(cells[1])
    if (!value || !label || label === '-') continue
    options.push({ value, label })
  }
  return options
}

export function parseCurrenciesDocument(doc: Document): DictionaryOption[] {
  return parseTwoColumnDictionary(doc)
}

export function parseThirdPartyTypesDocument(doc: Document): DictionaryOption[] {
  return parseTwoColumnDictionary(doc)
}

export function parseWorkforceDocument(doc: Document): DictionaryOption[] {
  return parseTwoColumnDictionary(doc)
}

export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('tr.oddeven') && !!doc.querySelector('input[name="password"]')
}
