import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { cellText } from './legacyTable'

// accountancy/closure/financialvalidate.php?year=YYYY — "Financial Closing".
// One POST form (token, action=validate): a checkbox `toselect[]` per month
// (value 1-12, each with a hidden `monthyear[]` = the year), a start date
// (`date_debut` + hidden day/month/year parts), the author and validator user
// selects (`fk_user_author`, `fk_user_validator`) and a public note. Confirmed
// live against 172.16.5.55.

// One line of a month's "pending" dialog, e.g. "Customer Invoice Binding" (2) or "Sales Journal" (0).
export interface FinancialClosurePendingItem {
  label: string
  count: number
}

export interface FinancialClosurePendingGroup {
  title: string // "Binding (Pending)" / "Journal (Pending)"
  items: FinancialClosurePendingItem[]
}

export interface FinancialClosureMonth {
  value: string // "1".."12"
  label: string // "Jan-2026"
  movements: string // first number of the backend's "0(0)" cell
  unvalidated: string // the number in brackets (printed in red on the page)
  // Ticked on the backend page (a month already part of this year's closing).
  checked: boolean
  // The month's own "pending" dialog: what still has to be bound or journalized.
  pending: FinancialClosurePendingGroup[]
}

// A year-end closing already recorded for the year (the page then offers Update / Approve).
export interface FinancialClosureExisting {
  id: string
  approval: string // "Approved" / "Pending Approval"
  workStatus: string // "Started" / "Pending" / "Completed"
}

export type FinancialClosureAction = 'validate' | 'update' | 'approve'

export interface FinancialClosureForm {
  token: string
  year: string
  hidden: Record<string, string> // every hidden input except the per-month ones
  months: FinancialClosureMonth[]
  monthYears: string[] // the hidden monthyear[] values, one per month
  startDate: string // mm/dd/yyyy as printed, may be empty
  authors: { value: string; label: string }[]
  author: string
  validators: { value: string; label: string }[]
  validator: string
  note: string
  existing: FinancialClosureExisting | null
  // The buttons the page prints for this year: "Create Year Ending" (validate) while there is
  // no closing, "Update Year Ending" and "Approve" once there is.
  actions: { action: FinancialClosureAction; label: string }[]
}

// The month's `#staticBackdrop_<month>` dialog: <h5> group titles, each followed by <p> lines
// such as "Customer Invoice Binding (0)Click To bind".
function readPending(doc: Document, month: string): FinancialClosurePendingGroup[] {
  const body = doc.querySelector(`#staticBackdrop_${month} .modal-body`)
  const groups: FinancialClosurePendingGroup[] = []
  body?.querySelectorAll('h5, p').forEach((el) => {
    if (el.tagName === 'H5') {
      groups.push({ title: cellText(el), items: [] })
      return
    }
    const m = cellText(el).match(/^(.*?)\s*\((\d+)\)/)
    if (m && groups.length > 0) groups[groups.length - 1].items.push({ label: m[1].trim(), count: Number(m[2]) })
  })
  return groups
}

const badgeOf = (root: ParentNode, label: RegExp): string => {
  const row = Array.from(root.querySelectorAll('tr')).find((tr) => label.test(cellText(tr.children[0])))
  return cellText(row?.querySelector('.badge-status'))
}

export function parseFinancialClosure(doc: Document, year: string): FinancialClosureForm {
  const check = doc.querySelector('input[name="toselect[]"]')
  const root: ParentNode = check?.closest('form') ?? doc

  const hidden: Record<string, string> = {}
  for (const i of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="hidden"][name]'))) {
    if (i.name !== 'monthyear[]' && !(i.name in hidden)) hidden[i.name] = i.value
  }
  if (!hidden.token) hidden.token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''

  const headRow = Array.from(root.querySelectorAll('tr')).find((tr) => /^Jan-\d{4}/.test(cellText(tr.children[0])))
  const heads = Array.from(headRow?.children ?? []).map((h) => cellText(h))

  const months = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="toselect[]"]')).map((box) => {
    const copy = box.closest('td')?.cloneNode(true) as Element | undefined
    copy?.querySelectorAll('script, style').forEach((s) => s.remove())
    const m = cellText(copy).match(/^(\d+)\s*\((\d+)\)/)
    return { value: box.value, label: heads[Number(box.value) - 1] ?? box.value, movements: m?.[1] ?? '0', unvalidated: m?.[2] ?? '0', checked: box.checked, pending: readPending(doc, box.value) }
  })

  const select = (name: string) => {
    const el = root.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
    return { options: Array.from(el?.options ?? []).map((o) => ({ value: o.value, label: cellText(o) })), value: el?.value ?? '' }
  }
  const author = select('fk_user_author')
  const validator = select('fk_user_validator')

  const actions = Array.from(root.querySelectorAll<HTMLButtonElement>('button[name="action"]'))
    .filter((b) => ['validate', 'update', 'approve'].includes(b.value))
    .map((b) => ({ action: b.value as FinancialClosureAction, label: cellText(b) }))

  return {
    token: hidden.token,
    year,
    note: root.querySelector('textarea[name="note_public"]')?.textContent ?? '',
    existing: hidden.updateid ? { id: hidden.updateid, approval: badgeOf(root, /^Status$/i), workStatus: badgeOf(root, /^Work Status$/i) } : null,
    actions,
    hidden,
    months,
    monthYears: Array.from(root.querySelectorAll<HTMLInputElement>('input[name="monthyear[]"]')).map((i) => i.value),
    startDate: root.querySelector<HTMLInputElement>('input[name="date_debut"]')?.value ?? '',
    authors: author.options,
    author: author.value,
    validators: validator.options,
    validator: validator.value,
  }
}

const PATH = '/accountancy/closure/financialvalidate.php'

export function useFinancialClosureForm(year: number) {
  return useQuery({
    queryKey: ['generalLedger', 'financialClosureForm', year],
    queryFn: async () => parseFinancialClosure(await fetchLegacyDocument(PATH, new URLSearchParams({ year: String(year) })), String(year)),
    staleTime: 0,
    gcTime: 0, // the CSRF token must not outlive the page
  })
}

export interface FinancialClosureInput {
  form: FinancialClosureForm
  action: FinancialClosureAction
  months: string[] // ticked month values
  startDate: string // mm/dd/yyyy
  author: string
  validator: string
  note: string
}

// One of the page's three submit buttons. They all post the same form (the buttons only differ in
// their `action` value): the ticked months with the year of every month, the start date, the two
// users and the note, plus the existing closing's id (`updateid`) once there is one.
export function useSubmitFinancialClosure() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (i: FinancialClosureInput): Promise<string> => {
      const m = i.startDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      const body = new URLSearchParams({
        ...i.form.hidden,
        date_debut: i.startDate,
        date_debutday: m?.[2] ?? '',
        date_debutmonth: m?.[1] ?? '',
        date_debutyear: m?.[3] ?? '',
        fk_user_author: i.author,
        fk_user_validator: i.validator,
        note_public: i.note,
        action: i.action,
      })
      for (const y of i.form.monthYears) body.append('monthyear[]', y)
      for (const month of i.months) body.append('toselect[]', month)
      const res = await fetch(`${PATH}?year=${i.form.year}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const msgs = toastMessages(html)
      const err = msgs.find((x) => x.type === 'error')
      if (err) throw new Error(err.message)
      // The page redirects back to itself; read it again to be sure the closing is recorded.
      const after = parseFinancialClosure(await fetchLegacyDocument(PATH, new URLSearchParams({ year: i.form.year })), i.form.year)
      if (i.action === 'validate' && !after.existing) throw new Error('The backend did not record this year-end closing.')
      if (i.action === 'approve' && !/^approved$/i.test(after.existing?.approval ?? '')) throw new Error('The backend did not approve this year-end closing.')
      return msgs.map((x) => x.message).join('\n')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
