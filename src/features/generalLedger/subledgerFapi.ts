import type { LedgerMeta, LedgerRow, SubledgerGroup, SubledgerReportData } from './ledgerReport'

// accountancy/fapi/subledger.php (22 Oct 2026): the bookkeeping lines of the period already grouped by subledger account, with the
// paging block, the period totals and per-line edit / delete flags. Field names below are the ones captured from newecuenta on
// 22 Oct 2026 (tests/fixtures/accountancy-subledger.json), not assumed. It honours the same filters as accountancy/fapi/list.php
// (document ref, journal, transaction number, label, account range, lettering, debit, credit, dates, paging, sorting), each checked
// against the four ledger lines on newecuenta.
interface FapiEntry {
  piece_num: string
  piece_url: string
  code_journal: string
  doc_date: string | null
  doc_ref: string
  doc_type: string
  fk_doc: number
  doc_url: string
  label_operation: string
  currency_code: string
  cur_montant: number
  debit: number
  credit: number
  lettering_code: string
  date_export: string | null
  can_edit: boolean
  edit_url: string | null
  can_delete: boolean
  delete_url: string | null
}

export interface FapiSubledger {
  meta: {
    page: number
    limit: number
    total_records: number
    total_pages: number
    returned_rows: number
    has_more: boolean
    next_page: number | null
    prev_page: number | null
  }
  summary: { period: { debit: number; credit: number; balance: number } }
  groups: Array<{ subledger_account: string; subledger_label: string; subtotal_debit: number; subtotal_credit: number; balance: number; entries: FapiEntry[] }>
}

function mapMeta(m: FapiSubledger['meta']): LedgerMeta {
  return { page: m.page, limit: m.limit, totalRecords: m.total_records, totalPages: m.total_pages, returnedRows: m.returned_rows, hasMore: m.has_more, nextPage: m.next_page, prevPage: m.prev_page }
}

function mapEntry(e: FapiEntry): LedgerRow {
  return {
    transactionNum: e.piece_num,
    cardUrl: e.piece_url,
    journal: e.code_journal,
    date: e.doc_date ?? '',
    accountingDoc: e.doc_ref,
    label: e.label_operation,
    currencyCode: e.currency_code,
    // The answer carries the foreign-currency original amount but no exchange rate, so the rate stays blank.
    conversionAmount: e.cur_montant ? String(e.cur_montant) : '',
    exchangeRate: '',
    debit: e.debit,
    credit: e.credit,
    letteringCode: e.lettering_code || '',
    dateExport: e.date_export ?? '',
    docType: e.doc_type,
    fkDoc: e.fk_doc ? String(e.fk_doc) : '',
    docUrl: e.doc_url || null,
    canEdit: e.can_edit,
    editUrl: e.edit_url,
    canDelete: e.can_delete,
    deleteUrl: e.delete_url,
  }
}

export function mapSubledgerFapi(data: FapiSubledger): SubledgerReportData {
  const groups: SubledgerGroup[] = data.groups
    .map((g) => {
      const net = g.subtotal_debit - g.subtotal_credit
      return {
        subledgerAccount: g.subledger_account || '',
        rows: g.entries.map(mapEntry),
        totalDebit: g.subtotal_debit,
        totalCredit: g.subtotal_credit,
        balance: Math.abs(net),
        balanceSide: (net >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr',
      }
    })
    // Real subledger accounts first (alphabetical), the lines with none last.
    .sort((a, b) => (a.subledgerAccount || '￿').localeCompare(b.subledgerAccount || '￿'))
  return { groups, grandTotalDebit: data.summary.period.debit, grandTotalCredit: data.summary.period.credit, meta: mapMeta(data.meta) }
}
