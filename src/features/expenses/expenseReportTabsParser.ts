// Parsers for the 4 separate legacy pages behind Expense Report's own tab
// bar (see expenseReportCardParser.ts's `tabs` field). No JSON API for any
// of these; all 4 are classic server-rendered pages.

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
  // Value of the "Save file on server with name..." checkbox, e.g.
  // "vox_admin-ER00006-230926045217-__file__" — sent verbatim as
  // `savingdocmask` when that checkbox is checked (see
  // expenseReportTabs.queries.ts's useUploadExpenseReportDocument); any
  // other literal value (e.g. "on", from treating this as a plain boolean
  // checkbox) produces an uploaded file with no extension.
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
    // The <label> text ("Note (public)"/"Note (private)") sits inside a
    // malformed fragment — a stray </td><td> pair with no enclosing <table>
    // at all — which Chrome and jsdom's HTML parser resolve differently
    // (the label comes back empty in the browser while jsdom finds it).
    // `field`, derived from the edit link's own action param, doesn't
    // depend on that markup at all, so the label is derived from it
    // instead of trusted from the fragile scraped text.
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
// audit block, the same template as Purchase Orders' info.php (see
// purchaseOrderInfoParser.ts's header comment) and Sales Orders'
// agenda.php. A draft record renders "Creation date" + "Latest
// modification date"; a modified/approved record adds "Modified by" and
// "Approved by" — but NOT necessarily separated by literal <br> tags.
// Parses by regex directly against the raw HTML instead — each label's
// value runs up to wherever the *next* known label starts (or the
// container ends), which doesn't depend on which markup separates them.
export interface ExpenseReportEvents {
  creationDate: string
  modifiedBy: string
  modifiedByUrl: string | null
  latestModificationDate: string
  approvedBy: string
  approvedByUrl: string | null
}

// expensereport/ledgerentry.php?id=N — the accounting-binding ledger table
// (Date/Accounting Doc./Ref./CodeJournal/Account/Label/Debit/Credit/
// Amount) plus its own "Balance" total row.
export interface ExpenseReportLedgerRow {
  cells: string[]
}
export interface ExpenseReportLedgerData {
  columns: string[]
  rows: ExpenseReportLedgerRow[]
  balance: { debit: string; credit: string; amount: string } | null
}
