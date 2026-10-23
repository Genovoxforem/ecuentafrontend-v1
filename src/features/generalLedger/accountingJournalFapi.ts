import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { JournalPage, JournalRow } from './accountingJournalParser'

// The four accounting journals on accountancy/fapi/journals.php (22 Oct 2026): a preview of what would be written to the ledger
// (GET) and the write itself (POST action=writebookkeeping). The bank journal answer was captured from newecuenta on 22 Oct 2026
// (tests/fixtures/accountancy-journal-finance.json); the other three journals are empty there. The write response is "representative"
// in the document and was not run (it writes the ledger, and the ledger's piece-number bug is open).

export interface FapiJournalLine {
  account: string
  account_label: string
  subledger_account: string
  subledger_label: string
  label_operation: string
  debit: number
  credit: number
}
export interface FapiJournalDocument {
  doc_id: number
  doc_type: string
  ref: string
  date: string
  type?: string
  status: string
  lines?: FapiJournalLine[]
}
export interface FapiJournal {
  journal: { id: number; code: string; label: string; nature: number; builder: string }
  period: { date_start: string; date_end: string; source: string }
  in_bookkeeping: string
  documents: FapiJournalDocument[]
  totals: { documents: number; lines: number; debit: number; credit: number }
}

const usDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
const isoDate = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : undefined
}

const IN_BOOKKEEPING = [
  { value: 'notyet', label: 'Not yet journalized' },
  { value: 'already', label: 'Already journalized' },
  { value: 'all', label: 'All' },
]

export function mapJournal(d: FapiJournal, bank: boolean): JournalPage {
  const rows: JournalRow[] = d.documents.flatMap((doc) =>
    (doc.lines ?? []).map((l) => ({
      date: usDate(doc.date),
      doc: doc.ref,
      account: l.account,
      subledger: l.subledger_account,
      label: l.label_operation,
      partyName: '',
      partyId: '',
      paymentType: doc.type ?? '',
      debit: l.debit,
      credit: l.credit,
      debitText: l.debit ? formatMoney(l.debit) : '',
      creditText: l.credit ? formatMoney(l.credit) : '',
    })),
  )
  return {
    title: 'Journal Area',
    name: `${d.journal.code} - ${d.journal.label}`,
    description: '',
    token: '',
    dateStart: usDate(d.period.date_start),
    dateEnd: usDate(d.period.date_end),
    inBookkeeping: d.in_bookkeeping,
    inBookkeepingOptions: IN_BOOKKEEPING,
    warnings: [],
    docHeader: 'Accounting Doc.',
    hasPaymentType: bank,
    rows,
  }
}

const params = (dateStart: string, dateEnd: string, inBookkeeping: string) => ({
  date_start: isoDate(dateStart),
  date_end: isoDate(dateEnd),
  in_bookkeeping: inBookkeeping || undefined,
})

export async function loadJournal(key: string, f: { dateStart: string; dateEnd: string; inBookkeeping: string }): Promise<JournalPage> {
  return mapJournal(await fapiGet<FapiJournal>('/accountancy/fapi/journals.php', { journal: key, ...params(f.dateStart, f.dateEnd, f.inBookkeeping) }), key === 'finance')
}

export interface FapiJournalWrite {
  documents: Array<{ doc_id: number; ref: string; status: string; lines_written: number; message?: string }>
  summary: { documents_total: number; documents_written: number; documents_skipped: number; documents_error: number; lines_written: number; piece_nums: number[] }
}

// Writes every not-yet-journalized document of the range to the ledger, one transaction per document; resolves to the backend's summary.
export async function writeJournal(key: string, f: { dateStart: string; dateEnd: string; inBookkeeping: string }): Promise<FapiJournalWrite['summary']> {
  const p = params(f.dateStart, f.dateEnd, f.inBookkeeping)
  const res = await fapiPost<FapiJournalWrite>('/accountancy/fapi/journals.php', { in_bookkeeping: p.in_bookkeeping ?? 'notyet', date_start: p.date_start, date_end: p.date_end }, { journal: key, action: 'writebookkeeping' })
  if (res.summary.documents_error > 0) {
    const failed = res.documents.filter((x) => x.status === 'error').map((x) => `${x.ref}: ${x.message ?? 'error'}`)
    throw new Error(`${res.summary.documents_written} document(s) written, ${res.summary.documents_error} failed.\n${failed.join('\n')}`)
  }
  return res.summary
}

// The journal as a CSV file, built from the rows on screen.
export function journalCsv(page: JournalPage): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const head = ['Date', 'Accounting Doc.', 'Accounting account', 'Subledger account', 'Label', ...(page.hasPaymentType ? ['Payment Type'] : []), 'Debit', 'Credit']
  const lines = page.rows.map((r) => [r.date, r.doc, r.account, r.subledger, r.label, ...(page.hasPaymentType ? [r.paymentType] : []), r.debitText, r.creditText])
  return [head, ...lines].map((r) => r.map(q).join(',')).join('\r\n')
}
