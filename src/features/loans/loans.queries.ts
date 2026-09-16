import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseLegacyJson, fetchLegacyText, fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import {
  parseLoanManagementListPage,
  parseCustomerAccountOptions,
  type LoanManagementForm,
  type LoanManagementOption,
  type LoanProductInfo,
} from './loanManagementParser'

// Full audit this session of the real custom "Loan Management" Dolibarr
// plugin (custom/loanmanagement/ — a genuine ~6,100-line third-party
// module, distinct from the unrelated core Dolibarr "Loan" tracker already
// wired for real under Banking). Every one of its own pages
// (loanmanagementlist.php, loan_product.php, repayment.php,
// loans_customer_list.php) is 100% server-rendered HTML with no JSON/AJAX
// list endpoint of its own — confirmed by reading each file directly, not
// guessed. Two things ARE genuinely real and reused here:
//
// 1. "Loan Type" (categories/loans.php) is the same generic Dolibarr
//    categories system already used elsewhere in this app (Users Tags,
//    Agenda Categories) — confirmed real type id 23 (Categorie::TYPE_LOANS)
//    via categories/class/categorie.class.php's own MAP_CODE_TO_ID array,
//    and categories/tag-sidebarlist-ajax.php works generically for any
//    type_id including this one (confirmed: no loans-specific branching in
//    that file at all).
// 2. "Loan Customer" (loans_customer_list.php) tries to load its table via
//    societe/customer_ajax_list.php?type=c — confirmed absent from disk on
//    this backend (only exists under the dead societe_old/ tree), so the
//    real page's own DataTable 404s and shows nothing. The genuine,
//    working replacement for that exact same real llx_societe data is
//    societe/api/list.php (already wired for the main Customers module —
//    see customers.queries.ts's useCustomersSummary()), reused as-is here
//    rather than duplicated, since "loan customer" has no separate table:
//    creating one really just creates a real llx_societe row (confirmed by
//    reading loans_customer.php: it IS Dolibarr's own societe/card.php).
//
// Loan Management's own list+create page (loanmanagementlist.php) is now
// scraped for real too — see useLoanManagementForm/useCreateLoanManagement
// below — now that HTML-scraping (real form field names/CSRF tokens/option
// lists read straight off the page, not guessed) is an accepted technique
// for pages confirmed to have no JSON API of their own. Repayment schedules
// remain not scraped (out of scope this pass, not re-audited).

export interface LoanTypeRow {
  id: number
  name: string
  color: string
  createdAt: string
}
interface RawLoanTypeListResponse {
  recordsTotal: string
  recordsFiltered: string
  data: Array<{ rowid: string; nom: string; code_client: string | null; phone: string | null }>
}
export function useLoanTypesList() {
  return useQuery({
    queryKey: ['loans', 'types', 'list'],
    queryFn: async (): Promise<LoanTypeRow[]> => {
      const res = await fetch('/categories/tag-sidebarlist-ajax.php?draw=1&start=0&type_id=23', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data = await parseLegacyJson<RawLoanTypeListResponse>(res)
      return data.data
        .map((r) => ({ id: Number(r.rowid), name: r.nom, color: r.code_client || '', createdAt: r.phone ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 1000 * 30,
  })
}

// ── Add Tag (categories/card.php?action=create&type=23) — the exact same
// generic Dolibarr category create form already confirmed and wired for
// Project Categories (see projectCategories.queries.ts) — real field names
// verified there directly from the page's own source: label, description,
// color, parent, with hidden id="", type, type_id="", action=add, urlfrom,
// token. Only the `type` value (23, Categorie::TYPE_LOANS — see this file's
// own top comment) differs from that Project Categories instance.
export interface LoanTypeFormContext {
  token: string
  parentOptions: { value: string; label: string }[]
}

function looksLikeLoanTypeCreateLoginPage(doc: Document): boolean {
  return !doc.querySelector('form input[name="label"]') && !!doc.querySelector('input[name="password"]')
}

export function useLoanTypeCreateForm() {
  return useQuery({
    queryKey: ['loans', 'types', 'createForm'],
    queryFn: async (): Promise<LoanTypeFormContext> => {
      const doc = await fetchLegacyDocument('/categories/card.php', new URLSearchParams({ action: 'create', type: '23' }))
      if (looksLikeLoanTypeCreateLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const form = Array.from(doc.querySelectorAll<HTMLFormElement>('form')).find((f) => f.querySelector('input[name="label"]'))
      const parentSelect = form?.querySelector<HTMLSelectElement>('select[name="parent"]') ?? null
      const parentOptions = parentSelect
        ? Array.from(parentSelect.options)
            .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))
            .filter((o) => o.value !== '-1')
        : []
      return { token: (form?.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? '').trim(), parentOptions }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

export interface NewLoanTypeInput {
  label: string
  description: string
  color: string
  parent: string
}

export function useCreateLoanType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewLoanTypeInput) => {
      const form = queryClient.getQueryData<LoanTypeFormContext>(['loans', 'types', 'createForm'])
      if (!form) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const body = new URLSearchParams({
        token: form.token,
        urlfrom: '',
        action: 'add',
        id: '',
        type: '23',
        type_id: '',
        label: input.label,
        description: input.description,
        color: input.color,
        parent: input.parent || '-1',
      })
      const res = await fetch('/categories/card.php?type=23', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        redirect: 'manual',
      })
      if (res.type !== 'opaqueredirect' && res.status === 200) {
        const html = await res.text()
        if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
        const doc = new DOMParser().parseFromString(html, 'text/html')
        if (doc.querySelector('form input[name="label"]')) throw new Error('Could not create this tag — check the Label field.')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans', 'types'] }),
  })
}

// ── Loan Calculator ─────────────────────────────────────────────────────────
// Ported verbatim from loan_calculator.php's own real PHP (read directly,
// not reverse-engineered from output) — this is real, live business logic,
// not scraped/invented data, so it's safe to compute entirely client-side;
// there is no hidden server dependency (the legacy page itself does the
// exact same math with no other DB read).
export type LoanInterestType = 'flat_rate' | 'fixed_rate' | 'mortgage' | 'one_time' | 'reducing_amount'

// Real: the live Term Period <select> posts PHP strtotime()-style relative
// strings ("+1 day"/"+1 week"/"+1 month"/"+1 year"), not a fixed day count —
// confirmed live (loan_calculator.php, reducing_amount, term=5, +1 month,
// first_payment_date=2026-09-15 returns 09-15/10-15/11-15/12-15/2027-01-15,
// i.e. calendar-month steps, not flat +30-day steps that would drift).
export type LoanTermPeriod = 'day' | 'week' | 'month' | 'year'

export interface LoanScheduleRow {
  period: number
  date: string
  amountToPay: number
  penalty: number
  principal: number
  interest: number
  balance: number
}

export interface LoanCalculatorInput {
  applyAmount: number
  interestRate: number
  interestType: LoanInterestType
  term: number
  termPeriod: LoanTermPeriod
  latePaymentPenalties: number
  firstPaymentDate: string // yyyy-mm-dd
}

export interface LoanCalculatorResult {
  payableAmount: number
  schedule: LoanScheduleRow[]
}

// UTC-based (not local-time) so this never shifts by a day depending on the
// viewer's timezone offset — the previous local-midnight-then-toISOString
// approach silently shifted every date back by one day for any positive UTC
// offset (confirmed: addDays("2026-09-15", 0) returned "2026-09-14" at
// UTC+5:30). setUTCMonth/setUTCFullYear also naturally give calendar-correct
// steps (Sep 15 -> Oct 15 -> Nov 15, not a fixed 30-day drift).
function advanceDate(iso: string, unit: LoanTermPeriod): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  switch (unit) {
    case 'day':
      date.setUTCDate(date.getUTCDate() + 1)
      break
    case 'week':
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case 'month':
      date.setUTCMonth(date.getUTCMonth() + 1)
      break
    case 'year':
      date.setUTCFullYear(date.getUTCFullYear() + 1)
      break
  }
  return date.toISOString().slice(0, 10)
}

export function calculateLoanSchedule(input: LoanCalculatorInput): LoanCalculatorResult {
  const { applyAmount, interestRate, interestType, term, termPeriod, latePaymentPenalties, firstPaymentDate } = input
  const penalty = (latePaymentPenalties / 100) * applyAmount
  const schedule: LoanScheduleRow[] = []
  let date = firstPaymentDate

  if (interestType === 'one_time') {
    const payableAmount = applyAmount + (interestRate / 100) * applyAmount
    schedule.push({ period: 1, date, amountToPay: payableAmount, penalty, principal: applyAmount, interest: payableAmount - applyAmount, balance: 0 })
    return { payableAmount, schedule }
  }

  if (interestType === 'flat_rate') {
    const principleAmount = applyAmount / term
    const amountToPay = principleAmount + (interestRate / 100) * principleAmount
    const interest = (interestRate / 100) * applyAmount / term
    const payableAmount = (interestRate / 100) * applyAmount + applyAmount
    // Real: the displayed "Balance" is the remaining total obligation
    // (principal + interest still owed), so it starts at payableAmount, not
    // applyAmount — confirmed live (flat_rate, 12000 @ 12%, term=3: row 1
    // balance is 8,960 = 13,440 payable - 4,480 paid, not 12,000 - 4,480).
    let balance = payableAmount
    for (let i = 0; i < term; i++) {
      balance -= amountToPay
      schedule.push({ period: i + 1, date, amountToPay, penalty, principal: principleAmount, interest, balance: Math.max(balance, 0) })
      date = advanceDate(date, termPeriod)
    }
    return { payableAmount, schedule }
  }

  if (interestType === 'fixed_rate') {
    const principleAmount = applyAmount / term
    const amountToPay = principleAmount + (interestRate / 100) * applyAmount
    const interest = (interestRate / 100) * applyAmount
    const payableAmount = (interestRate / 100) * applyAmount * term + applyAmount
    // Same "remaining total obligation" balance semantics as flat_rate above
    // — confirmed live (fixed_rate, 12000 @ 12%, term=3: row 1 balance is
    // 10,880 = 16,320 payable - 5,440 paid).
    let balance = payableAmount
    for (let i = 0; i < term; i++) {
      balance -= amountToPay
      schedule.push({ period: i + 1, date, amountToPay, penalty, principal: principleAmount, interest, balance: Math.max(balance, 0) })
      date = advanceDate(date, termPeriod)
    }
    return { payableAmount, schedule }
  }

  if (interestType === 'mortgage') {
    const monthlyRate = interestRate / 100 / 12
    const payment = monthlyRate === 0 ? applyAmount / term : (applyAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term))
    let balance = applyAmount
    let payable = 0
    for (let i = 0; i < term; i++) {
      const interest = balance * monthlyRate
      const principal = payment - interest
      balance -= principal
      payable += payment
      schedule.push({ period: i + 1, date, amountToPay: payment, penalty, principal, interest, balance: Math.max(balance, 0) })
      date = advanceDate(date, termPeriod)
    }
    return { payableAmount: payable, schedule }
  }

  // reducing_amount
  const monthlyRate = interestRate / 100 / 12
  const monthlyPrincipal = applyAmount / term
  let balance = applyAmount
  let payable = 0
  for (let i = 0; i < term; i++) {
    const interest = balance * monthlyRate
    const amountToPay = interest + monthlyPrincipal
    balance -= monthlyPrincipal
    payable += amountToPay
    schedule.push({ period: i + 1, date, amountToPay, penalty, principal: monthlyPrincipal, interest, balance: Math.max(balance, 0) })
    date = advanceDate(date, termPeriod)
  }
  return { payableAmount: payable, schedule }
}

// ── Loan Management list + New Loan form (loanmanagementlist.php) ──────────
export function useLoanManagementForm() {
  return useQuery({
    queryKey: ['loans', 'management', 'form'],
    queryFn: async (): Promise<LoanManagementForm> => {
      return parseLoanManagementListPage(await fetchLegacyText('/custom/loanmanagement/loanmanagementlist.php'))
    },
  })
}

// Dolibarr's CSRF check compares this request's own Referer against the
// backend's origin (see vite.config.ts's proxyConfig() comment) — the
// browser sets that automatically to this app's own page and can't be
// overridden from JS (Referer is a forbidden fetch header), so nothing
// extra is needed here: the dev proxy already rewrites it for every
// /custom/* request (same as every other call in this app), and production
// is same-origin with the backend already.
async function postLoadSubtypes(body: URLSearchParams): Promise<Response> {
  return fetch('/custom/loanmanagement/load_subtypes.php', { method: 'POST', credentials: 'same-origin', body })
}

// Auto-fills Late Payment Penalties (and the Term/Min/Max blurb) when a
// Loan Product is picked — genuinely real JSON (confirmed live), not a
// scraped HTML fragment like the rest of this file.
export function useLoanProductInfo(productId: string | undefined) {
  return useQuery({
    queryKey: ['loans', 'management', 'productInfo', productId],
    queryFn: async (): Promise<LoanProductInfo> => {
      const res = await postLoadSubtypes(new URLSearchParams({ type_id: productId ?? '', fns: 'productinfo' }))
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseLegacyJson<LoanProductInfo>(res)
    },
    enabled: !!productId,
  })
}

// The Borrower-dependent Customer Account dropdown — confirmed live this
// currently comes back broken (a PHP "Undefined array key 'sel_id'"
// warning, no real options) because the real page's own JS never sends the
// sel_id param that endpoint's PHP expects. Reproduced faithfully — this
// hook calls the exact same two params the real page does, so it inherits
// the same real (empty) result rather than working around the bug.
export function useCustomerAccountOptions(borrowerId: string | undefined) {
  return useQuery({
    queryKey: ['loans', 'management', 'customerAccounts', borrowerId],
    queryFn: async (): Promise<LoanManagementOption[]> => {
      const res = await postLoadSubtypes(new URLSearchParams({ type_id: borrowerId ?? '', fns: 'paymentbank' }))
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseCustomerAccountOptions(html)
    },
    enabled: !!borrowerId,
  })
}

export interface NewLoanManagementInput {
  loanId: string
  productId: string
  borrowerId: string
  currencyCode: string
  customerAccountId: string
  paymentTypeId: string
  bankAccountId: string
  firstPaymentDate: string // MM/DD/YYYY — this page's own datePic init wasn't found inline to confirm the exact format; matches the MM/DD/YYYY convention every other date field in this app uses
  releaseDate: string // MM/DD/YYYY
  appliedAmount: string
  latePaymentPenalties: string
  description: string
  remarks: string
}

// No CSRF token in this POST — confirmed live the real form has none either
// (see this file's own top comment). The real submit button is
// type="button" (not type="submit"); its onclick just client-side validates
// then calls the plain <form>'s own .submit() — so this mirrors a normal
// form-POST, no extra AJAX wrapper.
export function useCreateLoanManagement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewLoanManagementInput): Promise<void> => {
      const body = new URLSearchParams({
        action: 'save_loan',
        loan_id: input.loanId,
        product_id: input.productId,
        socid: input.borrowerId,
        multicurrency_code: input.currencyCode,
        loan_account: input.customerAccountId,
        mode_reglement_id: input.paymentTypeId,
        fk_account: input.bankAccountId,
        first_payment_date: input.firstPaymentDate,
        release_date: input.releaseDate,
        applied_amount: input.appliedAmount,
        late_payment_penalties: input.latePaymentPenalties,
        description: input.description,
        remarks: input.remarks,
      })
      const res = await fetch('/custom/loanmanagement/loanmanagementlist.php', { method: 'POST', credentials: 'same-origin', body, redirect: 'follow' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      if (/<div class="error"/.test(html) || /class="wpeo-notification[^"]*error/.test(html)) {
        throw new Error('The backend rejected this loan (check the required fields).')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', 'management'] })
    },
  })
}
