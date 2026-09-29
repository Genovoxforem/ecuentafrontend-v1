// expensereport/card.php?id=N — Dolibarr's real Expense Report detail page
// (distinct backend module from expense/, see expenseReportsList.queries.ts's
// own header comment). Confirmed live against 172.16.5.10 (id=7): header
// banner (Ref/Project/status badge/ledger-accounted text), a 2-column field
// table (User, optionally ThirdParty + Vendor invoice once validated/bound,
// Period, Validation date, User responsible for approval), an amount
// summary table (Amount excl./VAT/Amount inc. tax), the "Item Table" line
// editor (#tablelines — every sample fetched this session had zero
// persisted lines, just the always-present add-line input row; lines are
// parsed generically below in case a populated one exists, but that markup
// wasn't confirmed live), a Payments summary table (Already paid/Amount
// claimed/Remaining unpaid), and the standard builddoc "Linked files" doc
// generator. No JSON API for this page as a whole (expense_report_lines_api.php
// backs the line editor's own save/delete actions only, not read here).

export interface ExpenseReportField {
  label: string
  value: string
  href: string | null
}

export interface ExpenseReportLine {
  cells: string[]
}

export interface ExpenseReportTab {
  // Real id attribute off the tab's own <a id="..."> (card/documents/note/
  // info/ledgerentry) — used to switch tabs in-app instead of matching on
  // label text, which could drift.
  key: string
  label: string
  href: string
  active: boolean
}

export interface ExpenseReportCard {
  // Real CSRF token off this exact page load — needed to POST the real
  // Delete/Clone confirm actions (see expenseReportActions.queries.ts).
  token: string
  ref: string
  projectLabel: string
  projectEditUrl: string | null
  status: string
  statusClass: string
  ledgerStatusText: string
  editUrl: string | null
  cloneUrl: string | null
  deleteUrl: string | null
  closeUrl: string | null
  fields: ExpenseReportField[]
  amountExclTax: string
  vat: string
  amountIncTax: string
  currency: string
  itemColumns: string[]
  lines: ExpenseReportLine[]
  payments: { alreadyPaid: string; amountClaimed: string; remainingUnpaid: string }
  docTemplateOptions: string[]
  tabs: ExpenseReportTab[]
  // Real add-line form fields, scraped from the always-present input row
  // (#fk_c_type_fees / #line_fk_project / #vatrate) — confirmed live
  // (id=6/7): 77 real expense types, real VAT rate codes ("16 (A)" etc,
  // not plain numbers — the code suffix is significant, see
  // expense_manager.js's own addLineFromInline), and 0+ real projects
  // (empty beyond the placeholder when the record has none, which was
  // every sample fetched this session).
  expenseTypeOptions: { value: string; label: string }[]
  projectOptions: { value: string; label: string }[]
  vatRateOptions: { value: string; label: string }[]
  // The real "Choose the data you want to clone" modal's own user select
  // (#userid) — confirmed live: cloning genuinely requires picking which
  // user to clone the report for, real field, not optional.
  cloneUserOptions: { value: string; label: string }[]
}

function absolutize(href: string): string {
  if (!href || href.startsWith('http')) return href
  return href.startsWith('/') ? href : `/expensereport/${href}`
}

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// Strips the real avatar-initials badge ("AP", "WI", ...) some field values
// carry before the actual name — confirmed live it's real rendered text (a
// generated-avatar div, not decorative-only), so a plain textContent read
// runs it straight into the name ("APApex") with no separating whitespace
// in the source markup. Same fix as expenseReportsList.queries.ts's own
// cellText helper.
function textStripAvatar(el: Element | null): string {
  if (!el) return ''
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('[class*="avatar"]').forEach((n) => n.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// Finds a <td> by its exact trimmed text and returns the very next <td> in
// document order — the real markup for both the field table and the
// Payments summary table puts label/value in adjacent sibling cells (a
// colspan on the label cell doesn't add extra DOM siblings).
function valueAfterLabel(doc: Document, label: string): string {
  const cells = Array.from(doc.querySelectorAll('td'))
  const idx = cells.findIndex((td) => text(td) === label)
  return idx === -1 ? '' : text(cells[idx + 1])
}

export function parseExpenseReportCard(doc: Document): ExpenseReportCard {
  const token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
  const refBlock = doc.querySelector('.refidno-sub')
  const refLines = (refBlock?.innerHTML ?? '')
    .split(/<br\s*\/?>/i)
    .map((chunk) => {
      const tmp = document.createElement('div')
      tmp.innerHTML = chunk
      return (tmp.textContent ?? '').replace(/\s+/g, ' ').trim()
    })
  const ref = (refLines[0] ?? '').replace(/^Ref No\s*:\s*/i, '')
  const projectLabel = (refLines[1] ?? '').replace(/^Project\s*:\s*/i, '')
  const projectEditUrl = doc.querySelector<HTMLAnchorElement>('.refidno-sub a.editfielda')?.getAttribute('href') ?? null

  const statusEl = doc.querySelector('.subTitle .badge-status')
  const status = text(statusEl)
  const statusClass = Array.from(statusEl?.classList ?? []).find((c) => /^badge-status\d+$/.test(c)) ?? 'badge-status0'
  const ledgerStatusText = text(doc.querySelector('.statusrefbis .opacitymedium'))

  const headerActions = doc.querySelector('.ecnta-new-product-info-header .tabsAction')
  const editUrl = headerActions?.querySelector<HTMLAnchorElement>('a[href*="action=edit"]')?.getAttribute('href') ?? null
  const cloneUrl = headerActions?.querySelector<HTMLAnchorElement>('a[href*="action=clone"]')?.getAttribute('href') ?? null
  const deleteUrl = headerActions?.querySelector<HTMLAnchorElement>('a.butActionDelete[href*="action=delete"]')?.getAttribute('href') ?? null
  const closeUrl = headerActions?.querySelector<HTMLAnchorElement>('a[href$="list.php"]')?.getAttribute('href') ?? null

  // On Approved/Validated records, this same table also carries the
  // builddoc "Doc template" row and its trailing "None" (linked-files)
  // row — real markup, not a parser miss, confirmed live (id=6, Approved
  // status). Those rows contain a real <select>/inline <script>, which a
  // plain textContent read runs straight into the field's displayed value
  // as raw JS source — every genuine field row here is plain text/a link/a
  // badge, never a form control, so a row containing one is excluded
  // rather than trying to strip script text out of it.
  const allFieldRows = Array.from(doc.querySelectorAll('.fichehalfleft table.newCustomUItable > tbody > tr, .fichehalfleft table.newCustomUItable > tr'))
  // The builddoc "Doc template" row (tr.tbold) marks where this same table
  // starts carrying unrelated foster-parented content on records with
  // attachments/approvals — confirmed live (id=2, Approved + 1 real
  // attachment): everything from that row on is the doc-generator form and
  // its own attached-files listing, not a real card field, including plain
  // <a> download-link rows with no form control at all (so a "does this
  // row contain a form control" filter alone doesn't catch it). Slicing at
  // that boundary is what actually reflects the real page's own section
  // split, rather than trying to pattern-match every kind of row that can
  // follow it.
  const docTemplateIdx = allFieldRows.findIndex((tr) => tr.classList.contains('tbold'))
  const realFieldRows = docTemplateIdx === -1 ? allFieldRows : allFieldRows.slice(0, docTemplateIdx)
  const fields: ExpenseReportField[] = realFieldRows
    .map((tr) => {
      const tds = tr.querySelectorAll('td')
      if (tds.length < 2) return null
      const label = text(tds[0])
      if (!label) return null
      if (tds[1].querySelector('select, script, input, form')) return null
      const link = tds[1].querySelector('a')
      return { label, value: textStripAvatar(tds[1]), href: link?.getAttribute('href') ?? null }
    })
    .filter((f): f is ExpenseReportField => f !== null)

  const amountExclTax = valueAfterLabel(doc, 'Amount (excl. tax)') || text(doc.querySelector('.fichehalfright .amountcard'))
  const vatRow = doc.querySelector('.fichehalfright table.newCustomUItable')
  const amountRows = Array.from(vatRow?.querySelectorAll('tr') ?? [])
  const vat = amountRows[1] ? text(amountRows[1].querySelector('td:last-child')) : ''
  const amountIncTax = amountRows[2] ? text(amountRows[2].querySelector('td:last-child')) : ''
  const currency = (vat.match(/[A-Z]{3}/) ?? amountIncTax.match(/[A-Z]{3}/) ?? ['ZMW'])[0]

  // #tablelines itself ends up empty in the real DOM — its raw markup has a
  // <div> as direct invalid content inside a <table> before any row, so
  // HTML parsing foster-parents everything else (including the real
  // item-table with its thead/tbody) out to be its sibling instead. The
  // real headers/lines live on table.item-table, found independently by
  // class rather than assumed to be nested inside #tablelines.
  const itemColumns = Array.from(doc.querySelectorAll('table.item-table thead th')).map((th) => text(th))

  const lines: ExpenseReportLine[] = Array.from(doc.querySelectorAll('#lines-tbody-modern tr'))
    .filter((tr) => !tr.classList.contains('item-row-input'))
    .map((tr) => ({ cells: Array.from(tr.querySelectorAll('td')).map((td) => text(td)) }))
    .filter((line) => line.cells.some((c) => c))

  const payments = {
    alreadyPaid: valueAfterLabel(doc, 'Already paid:'),
    amountClaimed: valueAfterLabel(doc, 'Amount claimed:'),
    remainingUnpaid: valueAfterLabel(doc, 'Remaining unpaid:'),
  }

  const docTemplateOptions = Array.from(doc.querySelectorAll('#model option')).map((o) => text(o))

  // The real tab bar (Expense report / Linked files / Notes / Events /
  // LedgerEntry) — each a genuinely separate backend page (document.php,
  // note.php, info.php, ledgerentry.php), all now rendered natively (see
  // ExpenseReportDetailTabs.tsx). A tab with real content carries a real
  // count badge (<span class="badge">N</span>, e.g. "Linked files" with 1
  // attachment) — confirmed live (id=2) a plain textContent read runs that
  // count straight into the label with no separator ("Linked files1"), so
  // the badge is stripped from a clone before reading the label text.
  const tabs: ExpenseReportTab[] = Array.from(doc.querySelectorAll('.ecnta-new-product-tabs a.tab')).map((a) => {
    const labelClone = a.cloneNode(true) as Element
    labelClone.querySelectorAll('.badge').forEach((n) => n.remove())
    return {
      key: a.getAttribute('id') ?? '',
      label: text(labelClone),
      href: absolutize(a.getAttribute('href') ?? ''),
      active: a.classList.contains('tabactive'),
    }
  })

  const selectOptions = (selector: string) =>
    Array.from(doc.querySelectorAll<HTMLOptionElement>(`${selector} option`)).map((o) => ({ value: o.getAttribute('value') ?? '', label: text(o) }))
  const expenseTypeOptions = selectOptions('#fk_c_type_fees')
  const projectOptions = selectOptions('#line_fk_project')
  const vatRateOptions = selectOptions('#vatrate')
  const cloneUserOptions = selectOptions('#userid')

  return {
    token,
    ref,
    projectLabel,
    projectEditUrl: projectEditUrl ? absolutize(projectEditUrl) : null,
    status,
    statusClass,
    ledgerStatusText,
    editUrl: editUrl ? absolutize(editUrl) : null,
    cloneUrl: cloneUrl ? absolutize(cloneUrl) : null,
    deleteUrl: deleteUrl ? absolutize(deleteUrl) : null,
    closeUrl: closeUrl ? absolutize(closeUrl) : null,
    fields,
    amountExclTax,
    vat,
    amountIncTax,
    currency,
    itemColumns,
    lines,
    payments,
    docTemplateOptions: docTemplateOptions.length > 0 ? docTemplateOptions : ['standard'],
    tabs,
    expenseTypeOptions,
    projectOptions,
    vatRateOptions,
    cloneUserOptions,
  }
}
