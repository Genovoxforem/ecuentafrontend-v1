// Parsers for the 4 real, separate legacy pages behind Expense Report's own
// tab bar (see expenseReportCardParser.ts's `tabs` field) — each confirmed
// live against 172.16.5.10 (id=7). No JSON API for any of these; all 4 are
// classic server-rendered pages.

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// expensereport/document.php?id=N — a "Number/Total size of attached
// files" summary, an upload form + (on some backends) a link-a-URL form —
// both real classic form-POSTs, not reproduced here, see
// ExpenseReportDetailTabs.tsx — then two real tables: "Attached files and
// documents" (#tablelines: Documents/Size/Date) and "Linked files and
// documents" (the 2nd table.table-bordered.align-middle on the page: Links/
// Date). Both render a literal "No documents uploaded" / "No registered
// links" placeholder row when empty — filtered out here rather than parsed
// as a fake row (case-insensitively: different backends render this with
// different capitalization, e.g. "No Documents Uploaded").
export interface ExpenseReportDocumentRow {
  cells: string[]
}

// Structured (not just cell-text) row for the "Attached files and
// documents" table — needed so the real per-row Delete link (confirmed
// live) can actually be wired up, not just displayed. `action=deletefile`
// is the plain link the row itself carries; the real DELETE call rewrites
// it to `action=confirm_deletefile&...&confirm=yes` — same convention
// already established and verified working in
// OrderDetailShared.tsx's deleteOrderDocument.
export interface AttachedFileRow {
  name: string
  downloadUrl: string | null
  size: string
  date: string
  deleteUrl: string | null
}

export interface ExpenseReportDocumentsData {
  token: string
  attachedCount: string
  attachedTotalSize: string
  saveAsLabel: string
  // Real value of the "Save file on server with name..." checkbox, e.g.
  // "vox_admin-ER00006-230926045217-__file__" — sent verbatim as
  // `savingdocmask` when that checkbox is checked (see
  // expenseReportTabs.queries.ts's useUploadExpenseReportDocument);
  // confirmed live that sending any other literal value (e.g. "on", from
  // treating this as a plain boolean checkbox) breaks the real upload by
  // producing a file with no extension.
  saveAsMaskValue: string
  documentColumns: string[]
  documents: AttachedFileRow[]
  linkColumns: string[]
  links: ExpenseReportDocumentRow[]
}

function parseSimpleTable(table: Element | null): { columns: string[]; rows: ExpenseReportDocumentRow[] } {
  if (!table) return { columns: [], rows: [] }
  const trs = Array.from(table.querySelectorAll('tr'))
  const headerRow = trs[0]                
  const columns = headerRow ? Array.from(headerRow.querySelectorAll('th')).map((th) => text(th)) : []
  const rows = trs
    .slice(1)
    .map((tr) => ({ cells: Array.from(tr.querySelectorAll('td')).map((td) => text(td)) }))
    .filter((r) => r.cells.length > 1 || (r.cells[0] && !/^(No documents uploaded|No registered links)$/i.test(r.cells[0])))
  return { columns, rows }
}

function parseAttachedFiles(table: Element | null): { columns: string[]; rows: AttachedFileRow[] } {
  if (!table) return { columns: [], rows: [] }
  const trs = Array.from(table.querySelectorAll('tr'))
  const headerRow = trs[0]
  const columns = headerRow ? Array.from(headerRow.querySelectorAll('th')).map((th) => text(th)) : []
  const rows = trs
    .slice(1)
    .map((tr) => {
      const tds = tr.querySelectorAll('td')
      if (tds.length < 2) return null
      const nameLink = tds[0].querySelector('a')
      const name = text(tds[0])
      if (!name || /^No documents uploaded$/i.test(name)) return null
      const deleteLink = tr.querySelector('a.deletefilelink')
      return {
        name,
        downloadUrl: nameLink?.getAttribute('href') ?? null,
        size: text(tds[1]),
        date: text(tds[2] ?? null),
        deleteUrl: deleteLink?.getAttribute('href') ?? null,
      }
    })
    .filter((r): r is AttachedFileRow => r !== null)
  return { columns, rows }
}

function valueAfterLabel(doc: Document, label: string): string {
  const cells = Array.from(doc.querySelectorAll('td'))
  const idx = cells.findIndex((td) => text(td) === label)
  return idx === -1 ? '' : text(cells[idx + 1])
}

export function parseExpenseReportDocuments(doc: Document): ExpenseReportDocumentsData {
  const attachedTable = doc.querySelector('#tablelines')
  const allBorderedTables = Array.from(doc.querySelectorAll('table.table.table-bordered.align-middle'))
  const linksTable = allBorderedTables.find((t) => t !== attachedTable) ?? null

  const attached = parseAttachedFiles(attachedTable)
  const links = parseSimpleTable(linksTable)

  const token = doc.querySelector<HTMLInputElement>('#formuserfile input[name="token"]')?.value ?? ''
  const attachedCount = valueAfterLabel(doc, 'Number of attached files/documents')
  const attachedTotalSize = valueAfterLabel(doc, 'Total size of attached files/documents')
  const maskCheckbox = doc.querySelector<HTMLInputElement>('.savingdocmask')
  const saveAsLabel = text(maskCheckbox?.closest('td') ?? null).replace(/^Save file on server with name\s*/i, '').trim()
  const saveAsMaskValue = maskCheckbox?.getAttribute('value') ?? ''

  return {
    token,
    attachedCount,
    attachedTotalSize,
    saveAsLabel,
    saveAsMaskValue,
    documentColumns: attached.columns,
    documents: attached.rows,
    linkColumns: links.columns,
    links: links.rows,
  }
}

// expensereport/note.php?id=N — a real 2-column "Note (public)"/"Note
// (private)" panel, each with its own edit link (a classic form-POST, not a
// JSON write) and content area (rendered HTML, empty on every sample this
// session fetched).
export interface ExpenseReportNote {
  label: string
  html: string
  // 'public' | 'private', parsed off the real edit link's own
  // action=editnote_public/editnote_private — drives which real
  // action=setnote_public/setnote_private field the Save button POSTs to
  // (see useSaveExpenseReportNote).
  field: 'public' | 'private' | null
}

export interface ExpenseReportNotesData {
  token: string
  notes: ExpenseReportNote[]
}

export function parseExpenseReportNotes(doc: Document): ExpenseReportNotesData {
  const token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
  const notes = Array.from(doc.querySelectorAll('.tagtdnote')).map((block) => {
    const editHref = block.querySelector<HTMLAnchorElement>('a.editfielda')?.getAttribute('href') ?? null
    const contentDiv = block.parentElement?.querySelector('.tagtdremove') ?? null
    const field: 'public' | 'private' | null = editHref?.includes('editnote_public') ? 'public' : editHref?.includes('editnote_private') ? 'private' : null
    // The real <label> text ("Note (public)"/"Note (private)") sits inside
    // a genuinely malformed fragment — a stray </td><td> pair with no
    // enclosing <table> at all — which real Chrome and jsdom's HTML parser
    // resolve differently (confirmed live: the label came back empty in
    // the actual browser while a standalone jsdom test on the same saved
    // HTML found it fine). `field`, derived from the edit link's own real
    // action param, doesn't depend on that markup at all, so the label is
    // derived from it instead of trusted from the fragile scraped text.
    const label = field === 'public' ? 'Note (public)' : field === 'private' ? 'Note (private)' : text(block.querySelector('label'))
    return {
      label,
      html: (contentDiv?.innerHTML ?? '').trim(),
      field,
    }
  })
  return { token, notes }
}

// expensereport/info.php?id=N — Dolibarr's generic dol_print_object_info()
// audit block, same real template already confirmed for Purchase Orders'
// own info.php (see purchaseOrderInfoParser.ts's header comment) and Sales
// Orders' agenda.php. A draft record only ever renders "Creation date" +
// "Latest modification date" (confirmed live, 172.16.5.10); a
// modified/approved record adds "Modified by" and "Approved by" — but NOT
// necessarily separated by literal <br> tags (confirmed against a real
// populated record's markup: the previous <br>-splitting version silently
// merged all 4 lines into `creationDate` whenever the separator was some
// other block boundary instead). Parses by regex directly against the raw
// HTML instead — each label's value runs up to wherever the *next* known
// label starts (or the container ends), which doesn't depend on which
// markup actually separates them.
export interface ExpenseReportEvents {
  creationDate: string
  modifiedBy: string
  modifiedByUrl: string | null
  latestModificationDate: string
  approvedBy: string
  approvedByUrl: string | null
}

const EVENT_LABELS = ['Creation Date', 'Modified By', 'Latest Modification Date', 'Approved By']

function extractLabelValue(html: string, label: string): { text: string; href: string | null } {
  const escapedLabels = EVENT_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escapedLabel}\\s*:?\\s*([\\s\\S]*?)(?=(?:${escapedLabels})\\s*:|$)`, 'i')
  const m = re.exec(html)
  if (!m) return { text: '', href: null }
  const tmp = document.createElement('div')
  tmp.innerHTML = m[1]
  const href = tmp.querySelector('a')?.getAttribute('href') ?? null
  // Same avatar-initials-badge fix as expenseReportCardParser.ts's
  // textStripAvatar — "Modified By"/"Approved By" carry a real generated
  // avatar div before the name, which a plain textContent read runs
  // straight into it ("VAVoxforem Admin") with no separating whitespace.
  tmp.querySelectorAll('[class*="avatar"]').forEach((n) => n.remove())
  const text = (tmp.textContent ?? '').replace(/\s+/g, ' ').trim()
  return { text, href }
}

export function parseExpenseReportEvents(doc: Document): ExpenseReportEvents {
  const container = doc.querySelector('.product-content-body .fichecenter') ?? doc.querySelector('.product-content-body')
  const html = container?.innerHTML ?? ''

  const creation = extractLabelValue(html, 'Creation Date')
  const modified = extractLabelValue(html, 'Modified By')
  const latestMod = extractLabelValue(html, 'Latest Modification Date')
  const approved = extractLabelValue(html, 'Approved By')

  return {
    creationDate: creation.text,
    modifiedBy: modified.text,
    modifiedByUrl: modified.href,
    latestModificationDate: latestMod.text,
    approvedBy: approved.text,
    approvedByUrl: approved.href,
  }
}

// expensereport/ledgerentry.php?id=N — the real accounting-binding ledger
// table (Date/Accounting Doc./Ref./CodeJournal/Account/Label/Debit/Credit/
// Amount) plus its own "Balance" total row, both confirmed live.
export interface ExpenseReportLedgerRow {
  cells: string[]
}
export interface ExpenseReportLedgerData {
  columns: string[]
  rows: ExpenseReportLedgerRow[]
  balance: { debit: string; credit: string; amount: string } | null
}

export function parseExpenseReportLedger(doc: Document): ExpenseReportLedgerData {
  const table = doc.querySelector('.product-content-body table.table-striped')
  if (!table) return { columns: [], rows: [], balance: null }
  const columns = Array.from(table.querySelectorAll('thead th')).map((th) => text(th))
  const allTrs = Array.from(table.querySelectorAll('tbody tr, tr')).filter((tr) => !tr.closest('thead'))
  const balanceTr = allTrs.find((tr) => tr.classList.contains('liste_total'))
  const dataTrs = allTrs.filter((tr) => tr !== balanceTr)
  const rows = dataTrs
    .map((tr) => ({ cells: Array.from(tr.querySelectorAll('td')).map((td) => text(td)) }))
    .filter((r) => !(r.cells.length === 1 && /^No record found$/i.test(r.cells[0])))

  let balance: ExpenseReportLedgerData['balance'] = null
  if (balanceTr) {
    const cells = Array.from(balanceTr.querySelectorAll('td')).map((td) => text(td))
    balance = { debit: cells[cells.length - 3] ?? '0.00', credit: cells[cells.length - 2] ?? '0.00', amount: cells[cells.length - 1] ?? '0.00' }
  }

  return { columns, rows, balance }
}
