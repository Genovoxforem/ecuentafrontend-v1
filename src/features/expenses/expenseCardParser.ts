import { stripPhpWarnings } from '../generalLedger/accountingFilesParser'
import type { FormOption } from './expensePagesParser'

// The expense module's own card page (expense/card.php, served as a fragment by
// expense/api/expense_content.php?action=card&id=N): the report's lines, what can be done with it, its
// activity, and a sidebar of who and when. This reads what that page prints.

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

export interface ExpenseCardLine {
  id: string
  // Company name when the report is linked to a customer/vendor, otherwise the expense type.
  label: string
  // "09/22/2026 • VAT 16.000% • Bank Charges"
  subtitle: string
  product: string
  project: string
  description: string
  unit: string
  qty: string
  total: string
  // The attached receipt, if any (a file download on the backend).
  receipt: { name: string; previewUrl: string; downloadUrl: string } | null
}

// What the button bar offers for this report in its current state.
export type ExpenseCardAction = 'sendEmail' | 'print' | 'modify' | 'validate' | 'setDraft' | 'approve' | 'deny' | 'cancel' | 'recordPayment' | 'markPaid' | 'clone' | 'delete'

export interface ExpenseCardPerson {
  name: string
  // "ID #1", "vox_admin" or the approval date — whatever the card prints under the name.
  sub: string
  photo: string
}

export interface ExpenseCardLinked {
  label: string
  name: string
  photo: string
  // Town, e-mail, phone… as printed.
  details: string[]
}

export interface ExpenseCardPage {
  ref: string
  status: string
  author: string
  period: string
  // "Wilfred" with what it is: customer, vendor or employee.
  linked: { kind: 'customer' | 'vendor' | 'employee'; name: string }[]
  totals: { ht: string; vat: string; ttc: string }
  lines: ExpenseCardLine[]
  subtotal: string
  tax: string
  total: string
  actions: ExpenseCardAction[]
  timeline: { label: string; date: string; user: string; color: string }[]
  createdBy: ExpenseCardPerson | null
  linkedTo: ExpenseCardLinked[]
  dates: { label: string; value: string }[]
  validator: ExpenseCardPerson | null
  approvedBy: ExpenseCardPerson | null
  payment: { status: string; paid: string; ht: string; vat: string; ttc: string }
  notes: { label: string; value: string }[]
  // The payment dialog's own numbers: what is still to pay after advances and earlier payments.
  netPayable: string
  cloneUsers: FormOption[]
}

function cardByTitle(doc: Document, title: RegExp): Element | undefined {
  return Array.from(doc.querySelectorAll('.card, .ec-card')).find((c) => title.test(text(c.querySelector(':scope > .card-header, :scope > .ec-card-header'))))
}

function person(section: Element | null | undefined, subSelector?: string): ExpenseCardPerson | null {
  if (!section) return null
  const name = text(section.querySelector('div[style*="font-weight:600"]'))
  if (!name) return null
  const img = section.querySelector('img[src]')
  const subs = Array.from(section.querySelectorAll('div[style*="color:#6c757d"]')).map((d) => text(d))
  return { name, sub: subSelector ? text(section.querySelector(subSelector)) : (subs[0] ?? ''), photo: img?.getAttribute('src') ?? '' }
}

const ACTION_BY_DATA: Record<string, ExpenseCardAction> = {
  confirm_validate: 'validate',
  confirm_setdraft: 'setDraft',
  confirm_approve: 'approve',
  confirm_refuse: 'deny',
  confirm_cancel: 'cancel',
  confirm_set_paid: 'markPaid',
  confirm_delete: 'delete',
}

function readActions(doc: Document): ExpenseCardAction[] {
  const out: ExpenseCardAction[] = []
  for (const a of Array.from(doc.querySelectorAll('.tabsAction a'))) {
    const data = a.getAttribute('data-action') ?? ''
    const label = text(a)
    let action: ExpenseCardAction | undefined = ACTION_BY_DATA[data]
    if (!action) {
      if (a.getAttribute('data-bs-target') === '#ecCloneModal') action = 'clone'
      else if (a.getAttribute('data-bs-target') === '#ecPaymentModal') action = 'recordPayment'
      else if (/^Send Email/i.test(label)) action = 'sendEmail'
      else if (/^Print/i.test(label)) action = 'print'
      else if (/^Modify/i.test(label)) action = 'modify'
    }
    if (action) out.push(action)
  }
  return out
}

// null when the fragment is not a card (the backend prints "Expense not found" / "Access denied").
export function parseExpenseCard(html: string): ExpenseCardPage | null {
  const doc = new DOMParser().parseFromString(stripPhpWarnings(html), 'text/html')
  const banner = doc.querySelector('.fw-bold.fs-6')
  if (!banner) return null

  const meta = doc.querySelector('.fw-bold.fs-6')?.closest('div')?.parentElement?.querySelector(':scope > .text-muted')
  const metaParts = text(meta)
    .split('•')
    .map((s) => s.trim())
  const linked = Array.from(meta?.querySelectorAll('span') ?? []).map((s) => ({
    kind: s.querySelector('.fa-truck') ? ('vendor' as const) : s.querySelector('.fa-user') ? ('employee' as const) : ('customer' as const),
    name: text(s),
  }))
  const totalStrong = Array.from(doc.querySelectorAll('.d-flex.gap-3.small strong')).map((s) => text(s))
  const ttc = text(doc.querySelector('.d-flex.gap-3.small > span:last-child')).replace(/^TTC:\s*/, '')

  const lines: ExpenseCardLine[] = Array.from(doc.querySelectorAll('tr.expense-line-row')).map((tr) => {
    const c = (cls: string) => tr.querySelector(`.${cls}`)
    // previewReceiptUrl('<preview>', '<name>', '<download>')
    const click = c('cell-receipt')?.querySelector('a[onclick]')?.getAttribute('onclick') ?? ''
    const parts = Array.from(click.matchAll(/'([^']*)'/g)).map((m) => m[1])
    return {
      id: tr.getAttribute('data-line-id') ?? '',
      label: text(c('cell-type-label')),
      subtitle: text(c('cell-type-subtitle')),
      product: text(c('cell-product')),
      project: text(c('cell-project')),
      description: text(c('cell-description')),
      unit: text(c('cell-unit')),
      qty: text(c('cell-qty')),
      total: text(c('cell-total')),
      receipt: parts.length >= 3 ? { name: parts[1], previewUrl: parts[0], downloadUrl: parts[2] } : null,
    }
  })

  const timeline = Array.from(cardByTitle(doc, /^Activity/)?.querySelectorAll('.card-body > .d-flex.gap-3') ?? []).map((row) => {
    const body = row.querySelector('.flex-grow-1')
    const divs = Array.from(body?.querySelectorAll(':scope > div') ?? []).map((d) => text(d))
    const user = divs.find((d) => /^by /.test(d)) ?? ''
    return {
      label: divs[0] ?? '',
      date: divs.slice(1).find((d) => d !== user) ?? '',
      user: user.replace(/^by /, ''),
      color: /background:\s*(#[0-9a-f]{3,6})/i.exec(row.querySelector('div[style*="border-radius:50%"]')?.getAttribute('style') ?? '')?.[1] ?? '#6c757d',
    }
  })

  const linkedTo: ExpenseCardLinked[] = Array.from(cardByTitle(doc, /^Linked To/)?.querySelectorAll('.ec-sidebar-section') ?? []).flatMap((s) => {
    const label = text(s.querySelector('.ec-info-label')) || text(s.querySelector('.ec-info-value'))
    const name = text(s.querySelector('div[style*="font-weight:600"]')) || (s.querySelector('.ec-info-label') ? '' : label)
    if (!label && !name) return []
    const details = Array.from(s.querySelectorAll('div[style*="color:#6c757d"]'))
      .map((d) => text(d))
      .filter(Boolean)
    return [{ label, name: name || label, photo: s.querySelector('img[src]')?.getAttribute('src') ?? '', details }]
  })

  const paymentCard = cardByTitle(doc, /^Payment Summary/)
  const badges = Array.from(paymentCard?.querySelectorAll('.badge') ?? []).map((b) => text(b))
  const rowValue = (label: string) =>
    text(
      Array.from(paymentCard?.querySelectorAll('.d-flex') ?? [])
        .find((r) => text(r.querySelector('.ec-info-label')) === label)
        ?.querySelector('.ec-info-value'),
    )

  const approvedSection = cardByTitle(doc, /^Approved By/)?.querySelector('.ec-sidebar-section')
  const approved = person(approvedSection)

  return {
    ref: text(banner),
    status: text(banner.parentElement?.querySelector('.badge')),
    author: metaParts[0] ?? '',
    period: metaParts[1] ?? '',
    linked,
    totals: { ht: totalStrong[0] ?? '', vat: totalStrong[1] ?? '', ttc },
    lines,
    subtotal: text(doc.querySelector('#detail-total-ht')),
    tax: text(doc.querySelector('#detail-total-vat')),
    total: text(doc.querySelector('#detail-total-ttc')),
    actions: readActions(doc),
    timeline,
    createdBy: person(cardByTitle(doc, /^Created By/)?.querySelector('.ec-sidebar-section')),
    linkedTo,
    dates: Array.from(cardByTitle(doc, /^Period/)?.querySelectorAll('.col-6') ?? []).map((c) => ({ label: text(c.querySelector('.ec-info-label')), value: text(c.querySelector('.ec-info-value')) })),
    validator: person(cardByTitle(doc, /^Validator/)?.querySelector('.ec-sidebar-section')),
    approvedBy: approved,
    payment: { status: badges[0] ?? '', paid: badges[1] ?? '', ht: rowValue('Amount HT'), vat: rowValue('VAT'), ttc: text(paymentCard?.querySelector('.border-top span:last-child')) },
    notes: Array.from(cardByTitle(doc, /^Notes/)?.querySelectorAll('.ec-sidebar-section') ?? []).map((s) => ({
      label: text(s.querySelector('.ec-info-label')),
      value: text(s.querySelector('div:not(.ec-info-label)')),
    })),
    netPayable: text(doc.querySelector('#netPayableCell')),
    cloneUsers: Array.from(doc.querySelectorAll('select[name="clone_fk_user_author"] option')).map((o) => ({
      value: (o.getAttribute('value') ?? '').trim(),
      label: text(o),
      selected: o.hasAttribute('selected'),
    })),
  }
}
