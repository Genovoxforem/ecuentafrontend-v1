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

// Every row's edit/disable/delete links carry the real database rowid as a
// query param (confirmed live, e.g.
// "dict.php?...&rowid=5&code=TE_ADMIN&&id=8&action=edit&token=..."), even
// though it's never shown as a visible column — this is the numeric id
// societe/api/societes.php's typent_id/effectif_id fields actually need
// (see thirdPartyOptions.queries.ts), not the code text in the first cell.
function rowIdFromLinks(row: Element): string | null {
  const link = row.querySelector('a[href*="rowid="]')
  const href = link?.getAttribute('href') ?? ''
  const match = href.match(/[?&]rowid=(\d+)/)
  return match ? match[1] : null
}

// Currencies: [code, name, symbol, ...] — code (e.g. "ZMW") is what
// societe/api/societes.php's multicurrency_code field actually wants, not a
// numeric id, so this one keeps the first cell as its value.
export function parseCurrenciesDocument(doc: Document): DictionaryOption[] {
  const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
  const seenLabels = new Set<string>()
  const options: DictionaryOption[] = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    const value = cellText(cells[0])
    const label = cellText(cells[1])
    if (!value || !label || label === '-' || seenLabels.has(label)) continue
    // The <select> this feeds (ThirdPartyCreateForm.tsx / StepFormFields.tsx)
    // only ever sees the label string, both as the rendered option and as
    // the lookup key back to a real value — so two rows sharing a label
    // (confirmed live: "Turkey Lira" appears twice in this dictionary,
    // presumably an old/new Lira pair) are indistinguishable to the user
    // and would silently collide on whichever the label→value lookup finds
    // first. Keeping only the first occurrence matches that existing
    // lookup behavior instead of just hiding a duplicate React key warning.
    seenLabels.add(label)
    options.push({ value, label })
  }
  return options
}

// Third-party types and Workforce: societe/api/societes.php's typent_id/
// effectif_id both want the real numeric rowid (llx_c_typent.rowid /
// llx_c_effectif.rowid), so value comes from the row's own edit link, not
// the code text in the first cell. Falls back to the code if a row somehow
// has no rowid-bearing link (defensive only — every real row checked during
// verification had one).
function parseIdBackedDictionary(doc: Document): DictionaryOption[] {
  const rows = Array.from(doc.querySelectorAll('tr.oddeven'))
  const options: DictionaryOption[] = []
  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    const code = cellText(cells[0])
    const label = cellText(cells[1])
    if (!code || !label || label === '-') continue
    options.push({ value: rowIdFromLinks(row) ?? code, label })
  }
  return options
}

export function parseThirdPartyTypesDocument(doc: Document): DictionaryOption[] {
  return parseIdBackedDictionary(doc)
}

export function parseWorkforceDocument(doc: Document): DictionaryOption[] {
  return parseIdBackedDictionary(doc)
}

export function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('tr.oddeven') && !!doc.querySelector('input[name="password"]')
}
