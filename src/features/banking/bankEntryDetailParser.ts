import { stripTags } from '../../utils/text'
// compta/bank/line.php?rowid=N is a classic form page: "Bank entry"
// (name="update", action=update) for the transaction's own fields, plus a
// second, independent form ("Reconciliation", action=setreconcile) for its
// statement number / reconciled flag. Both post back to this same URL.
// Parsed the same way as bankAccountFormParser.ts: read this page once for
// its CSRF token + current field values + dropdown options, submit the
// field names Dolibarr's own form uses.
import { extractSelectOptions, type BankAccountFormOption } from './bankAccountFormParser'

export interface BankEntryLink {
  label: string
  // Recognized link kinds get routed in-app; anything else still renders,
  // just without a working href.
  kind: 'thirdparty' | 'payment' | 'entry' | 'other'
  id?: number
}

export interface BankEntryCategoryOption {
  value: string
  label: string
  selected: boolean
}

export interface BankEntryDetail {
  token: string
  rowid: number
  // Header strip — "Account: Bank008 (Bank008) | Amount: 100.00 ZMW |
  // Operation date: 07/20/2026" — read once here rather than re-derived from
  // the form fields below, since the real page shows this exact wording.
  headerAccountLabel: string
  headerAmount: string
  headerOperationDate: string
  accountedInLedger: boolean
  links: BankEntryLink[]
  accountId: string
  accountOptions: BankAccountFormOption[]
  paymentType: string
  paymentTypeOptions: BankAccountFormOption[]
  checkNum: string
  transmitter: string
  bankOfCheck: string
  dateOps: string // MM/DD/YYYY, as the real form's own text field shows it
  dateValue: string
  label: string
  amount: string
  currencyLabel: string
  categoryOptions: BankEntryCategoryOption[]
  reconcileStatement: string
  reconciled: boolean
}

function extractMultiSelectOptions(html: string, name: string): BankEntryCategoryOption[] {
  const openIdx = html.indexOf(`name="${name}"`)
  if (openIdx < 0) return []
  const closeIdx = html.indexOf('</select>', openIdx)
  const chunk = html.slice(openIdx, closeIdx > -1 ? closeIdx : openIdx + 20000)
  const options: BankEntryCategoryOption[] = []
  const optionRe = /<option\s+value="([^"]*)"([^>]*)>([^<]*)/g
  let m: RegExpExecArray | null
  while ((m = optionRe.exec(chunk))) {
    const value = m[1]
    const label = m[3].trim()
    if (!value || !label) continue
    options.push({ value, label, selected: /\bselected\b/.test(m[2]) })
  }
  return options
}

// The "Links" field is a free-form, comma-separated list of <a> tags — a
// third-party link + payment link for a customer payment entry, or a link
// to the *other* leg of an internal-transfer entry (`line.php?rowid=`, e.g.
// a Petty Cash <-> Bank transfer) for a LOAN/transfer-type entry —
// classified by href pattern rather than assumed to be one fixed shape.
function parseLinksCell(html: string): BankEntryLink[] {
  const links: BankEntryLink[] = []
  const anchorRe = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(html))) {
    const href = m[1]
    const withoutAvatar = m[2].replace(/<div class="avatar-circle"[^>]*>[^<]*<\/div>/, '')
    const label = stripTags(withoutAvatar)
    const socidMatch = href.match(/societe\/card\.php\?socid=(\d+)/)
    const paymentMatch = href.match(/paiement\/card\.php\?id=(\d+)/)
    const entryMatch = href.match(/compta\/bank\/line\.php\?rowid=(\d+)/)
    if (socidMatch) links.push({ label, kind: 'thirdparty', id: Number(socidMatch[1]) })
    else if (paymentMatch) links.push({ label, kind: 'payment', id: Number(paymentMatch[1]) })
    else if (entryMatch) links.push({ label, kind: 'entry', id: Number(entryMatch[1]) })
    else links.push({ label, kind: 'other' })
  }
  return links
}

function fieldValue(html: string, name: string): string {
  const re = new RegExp(`name="${name}"[^>]*value="([^"]*)"`)
  return html.match(re)?.[1] ?? ''
}

function checkboxChecked(html: string, name: string): boolean {
  const re = new RegExp(`<input[^>]*name="${name}"[^>]*>`)
  const tag = html.match(re)?.[0] ?? ''
  return /\bchecked\b/.test(tag)
}

export function parseBankEntryDetailPage(html: string, rowid: number): BankEntryDetail {
  const updateFormStart = html.indexOf('name="update"')
  const updateFormEnd = html.indexOf('</form>', updateFormStart)
  const updateForm = updateFormStart >= 0 ? html.slice(updateFormStart, updateFormEnd > -1 ? updateFormEnd : undefined) : html

  const tokenMatch = updateForm.match(/name="token"\s+value="([a-f0-9]+)"/)
  if (!tokenMatch) throw new Error('Could not find a CSRF token on the legacy page.')

  const headerMatch = updateForm.match(
    /<strong>Account:<\/strong>\s*([^&]*?)\s*&nbsp;\|&nbsp;\s*<strong>Amount:<\/strong>\s*([^&]*?)\s*&nbsp;\|&nbsp;\s*<strong>Operation date:<\/strong>\s*([^<]*)</,
  )
  const accountedMatch = updateForm.match(/AccountedInLedger<\/div><div[^>]*><i[^>]*><\/i>\s*<span[^>]*>([^<]*)<\/span>/)

  const linksMatch = updateForm.match(/<label class="form-label">Links<\/label><div class="form-control-plaintext">([\s\S]*?)<\/div><\/div>/)

  const account = extractSelectOptions(updateForm, 'accountid')
  const paymentType = extractSelectOptions(updateForm, 'value')

  // Reconciliation is a separate form (action=setreconcile), placed right
  // after the main update form's closing tag — sliced the same bounded way.
  const reconcileSectionStart = html.indexOf('Reconciliation</label>', updateFormEnd)
  const reconcileFormEnd = reconcileSectionStart >= 0 ? html.indexOf('</form>', reconcileSectionStart) : -1
  const reconcileForm = reconcileSectionStart >= 0 ? html.slice(reconcileSectionStart, reconcileFormEnd > -1 ? reconcileFormEnd : undefined) : ''

  return {
    token: tokenMatch[1],
    rowid,
    headerAccountLabel: (headerMatch?.[1] ?? '').trim(),
    headerAmount: (headerMatch?.[2] ?? '').trim(),
    headerOperationDate: (headerMatch?.[3] ?? '').trim(),
    accountedInLedger: (accountedMatch?.[1] ?? '').trim().toLowerCase() === 'yes',
    links: linksMatch ? parseLinksCell(linksMatch[1]) : [],
    accountId: account.selected,
    accountOptions: account.options,
    paymentType: paymentType.selected,
    paymentTypeOptions: paymentType.options,
    checkNum: fieldValue(updateForm, 'num_chq'),
    transmitter: fieldValue(updateForm, 'emetteur'),
    bankOfCheck: fieldValue(updateForm, 'banque'),
    dateOps: fieldValue(updateForm, 'dateo'),
    dateValue: fieldValue(updateForm, 'datev'),
    label: fieldValue(updateForm, 'label'),
    amount: fieldValue(updateForm, 'amount'),
    currencyLabel: stripTags(updateForm.match(/name="amount"[^>]*value="[^"]*"[^>]*>\s*<div class="input-group-text">([^<]*)<\/div>/)?.[1] ?? ''),
    categoryOptions: extractMultiSelectOptions(updateForm, 'custcats[]'),
    reconcileStatement: fieldValue(reconcileForm, 'num_rel'),
    reconciled: checkboxChecked(reconcileForm, 'reconciled'),
  }
}

// MM/DD/YYYY (the real form's own display format) -> Dolibarr's day/month/year
// hidden-field triplet, needed alongside the plain text field for the real
// action=update POST (see bankAccountFormParser.ts's useCreateBankAccount for
// the same re/reday/remonth/reyear pattern).
export function splitMdy(mdy: string): { day: string; month: string; year: string } {
  const [month, day, year] = mdy.split('/')
  return { day: day ?? '', month: month ?? '', year: year ?? '' }
}

// BankEntryDetail.tsx uses a native <input type="date"> (yyyy-mm-dd) for
// Operation/Value date instead of replicating the real page's jQuery
// datepicker text field — these convert between that and the MM/DD/YYYY the
// parsed detail data / the real form's own fields use.
export function mdyToIso(mdy: string): string {
  const { day, month, year } = splitMdy(mdy)
  if (!day || !month || !year) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function isoToMdy(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return ''
  return `${month}/${day}/${year}`
}

// ── Log tab (compta/bank/info.php?rowid=N) — no JSON API, real read-only
// page: who created/last-modified this entry and when, plus the same
// accounted-in-ledger status shown a second way ("Not yet accounted in
// ledger" vs — not yet seen live — presumably "Accounted in ledger").
export interface BankEntryLog {
  accountedStatusText: string
  createdByName: string
  createdByUserId?: number
  creationDate: string
  lastModificationDate: string
}

// ── LedgerEntry tab (compta/bank/ledgerentry.php?rowid=N) — read-only page:
// the accounting-ledger rows this bank entry has been posted to. The per-row
// cell shape below follows the table's own <thead> column order; not
// verified against a populated row.
export interface BankEntryLedgerRow {
  date: string
  accountingDoc: string
  ref: string
  codeJournal: string
  account: string
  label: string
  debit: string
  credit: string
  amount: string
}

export interface BankEntryLedger {
  rows: BankEntryLedgerRow[]
  totalDebit: string
  totalCredit: string
  totalAmount: string
}
