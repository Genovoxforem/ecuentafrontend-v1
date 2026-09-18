// custom/loanmanagement/loanmanagementlist.php — the real custom "Loan
// Management" plugin's list+create page (distinct from the core Dolibarr
// "Loan" tracker under Banking — see loans.queries.ts's own header comment).
// No JSON API for the list itself (confirmed live: its DataTable has no
// `ajax` option, just progressively-enhances whatever <tr> rows are already
// in the initial HTML — currently none, this backend has 0 loans yet), but
// its own "New Loan" panel is a genuine classic form-POST create — same
// category as every other scraped create-form in this app. Two real
// differences from those, both confirmed live:
//  1. No CSRF token field at all on this form (checked — the only `token`
//     inputs anywhere on this page belong to an unrelated currency-rate
//     mini-form elsewhere in the page chrome). A real gap in this custom
//     module, not something to paper over with a fabricated token.
//  2. "Customer Account" is a genuinely dependent dropdown — empty until
//     the Borrower is picked, then repopulated via a same-origin AJAX call
//     to load_subtypes.php (fns=paymentbank). Confirmed live that call
//     currently comes back broken server-side ("Undefined array key
//     'sel_id'" PHP warning, empty options) because the page's own JS never
//     actually sends a sel_id param that load_subtypes.php's PHP expects —
//     a genuine bug in the real page, reproduced faithfully here rather
//     than silently fixed.
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface LoanManagementOption {
  value: string
  label: string
}

// Real row shape not confirmed against a populated example (0 loans exist
// on this backend currently) — inferred from the list table's own <thead>
// column order (Loan ID, Loan Product, Borrower, Contact No, Release Date,
// Applied Amount, Status), same disclosed-but-unverified situation as
// bankBudgetParser.ts's per-category rows.
export interface LoanManagementRow {
  loanId: string
  loanProduct: string
  borrower: string
  contactNo: string
  releaseDate: string
  appliedAmount: string
  status: string
}

export interface LoanManagementForm {
  // The real form's own readonly "Loan ID" field, server-generated fresh on
  // every page load (e.g. "001") — sent back as-is with the create POST.
  nextLoanId: string
  productOptions: LoanManagementOption[]
  borrowerOptions: LoanManagementOption[]
  currencyOptions: LoanManagementOption[]
  currencySelected: string
  paymentTypeOptions: LoanManagementOption[]
  rows: LoanManagementRow[]
}

// Simple single-line <option value="X">Label</option> extractor (payment
// type, currency) — the borrower select needs its own multi-line-aware
// variant below since its real option text spans two lines (name, then a
// code/tpin/country detail line).
function extractOptions(html: string, name: string): { options: LoanManagementOption[]; selected: string } {
  const openIdx = html.indexOf(`name="${name}"`)
  if (openIdx < 0) return { options: [], selected: '' }
  const closeIdx = html.indexOf('</select>', openIdx)
  const chunk = html.slice(openIdx, closeIdx > -1 ? closeIdx : openIdx + 20000)
  const options: LoanManagementOption[] = []
  let selected = ''
  const optionRe = /<option\s+value=\s*"([^"]*)"([^>]*)>([^<]*)/g
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(chunk))) {
    const value = m[1]
    const label = m[3].trim()
    if (!value || !label) continue
    options.push({ value, label })
    if (/\bselected\b/.test(m[2])) selected = value
  }
  return { options, selected }
}

// The Borrower select's real option text (confirmed live) is two lines —
// the customer's display name, then "CU code | Tpin : X | Country : Y" on
// its own line — this keeps just the first (the name) as the option label,
// matching what a plain native <select> would read as its primary text.
function extractBorrowerOptions(html: string): LoanManagementOption[] {
  const openIdx = html.indexOf('name="socid"')
  if (openIdx < 0) return []
  const closeIdx = html.indexOf('</select>', openIdx)
  const chunk = html.slice(openIdx, closeIdx > -1 ? closeIdx : openIdx + 200000)
  const options: LoanManagementOption[] = []
  const optionRe = /<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(chunk))) {
    const value = m[1]
    const firstLine = stripTags(m[2]).split('\n')[0].trim()
    if (!value || value === '-1' || !firstLine) continue
    options.push({ value, label: firstLine })
  }
  return options
}

export function parseLoanManagementListPage(html: string): LoanManagementForm {
  const nextLoanIdMatch = html.match(/name="loan_id"\s+value="([^"]*)"/)
  const product = extractOptions(html, 'product_id')
  const currency = extractOptions(html, 'multicurrency_code')
  const paymentType = extractOptions(html, 'mode_reglement_id')
  const borrowerOptions = extractBorrowerOptions(html)

  const tbodyStart = html.indexOf('<thead>')
  const tbodyOpen = html.indexOf('<tbody>', tbodyStart)
  const tbodyEnd = html.indexOf('</tbody>', tbodyOpen)
  const tbody = tbodyOpen >= 0 ? html.slice(tbodyOpen + '<tbody>'.length, tbodyEnd > -1 ? tbodyEnd : undefined) : ''
  const rows: LoanManagementRow[] = []
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRe.exec(tbody))) {
    const cells = Array.from(rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((c) => stripTags(c[1]))
    if (cells.length < 7) continue
    const [loanId, loanProduct, borrower, contactNo, releaseDate, appliedAmount, status] = cells
    rows.push({ loanId, loanProduct, borrower, contactNo, releaseDate, appliedAmount, status })
  }

  return {
    nextLoanId: nextLoanIdMatch?.[1] ?? '',
    productOptions: product.options,
    borrowerOptions,
    currencyOptions: currency.options,
    currencySelected: currency.selected,
    paymentTypeOptions: paymentType.options,
    rows,
  }
}

// load_subtypes.php?fns=productinfo — genuinely real JSON (confirmed live),
// auto-fills Late Payment Penalties + shows the product's term/min/max when
// a Loan Product is picked.
export interface LoanProductInfo {
  penal: string
  des: string
  min: string
  max: string
}

// load_subtypes.php?fns=paymentbank — returns a raw <option> HTML fragment
// (not JSON), for the Borrower-dependent Customer Account select. Reuses
// the same option-parsing technique as the rest of this file.
export function parseCustomerAccountOptions(html: string): LoanManagementOption[] {
  const options: LoanManagementOption[] = []
  const optionRe = /<option\s+value=\s*"([^"]*)"[^>]*>([^<]*)/g
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(html))) {
    const value = m[1]
    const label = stripTags(m[2]).trim()
    if (!value || value === '-1' || !label) continue
    options.push({ value, label })
  }
  return options
}
