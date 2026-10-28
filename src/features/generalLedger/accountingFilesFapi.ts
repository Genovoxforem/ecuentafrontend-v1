import { fapi } from '../../api/axios'
import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { AccountingFileChoice, AccountingFileRow, AccountingFilesPage } from './accountingFiles.types'
import { usDateFromIso as usDate } from '../../utils/dates'

// accountancy/fapi/accounting_files.php (22-23 Oct 2026): the accountant-export listing of source documents, and (action=zip) a real zip of
// their files. The list answer was captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-accounting-files.json): twelve
// invoices. The kinds below are the endpoint's own filter names; the listing and the zip take them as flags.

export const KINDS: Array<{ name: string; label: string }> = [
  { name: 'invoices', label: 'Customer invoices' },
  { name: 'supplierinvoices', label: 'Vendor invoices' },
  { name: 'expensereports', label: 'Expense reports' },
  { name: 'donations', label: 'Donations' },
  { name: 'socialcontributions', label: 'Social or fiscal taxes' },
  { name: 'paymentsofsalaries', label: 'Salary payments' },
  { name: 'variouspayment', label: 'Miscellaneous payments' },
  { name: 'loanspayment', label: 'Loan payments' },
]

export interface FapiAccountingFiles {
  period: { date_start: string; date_end: string }
  filters: Record<string, boolean>
  count: number
  documents: Array<{
    item: string
    id: number
    ref: string
    date: string | null
    date_due: string | null
    paid: number
    amount_ht: number
    amount_ttc: number
    amount_vat: number
    currency: string
    thirdparty_name: string
    thirdparty_code: string
    country_code: string
    vatnum: string
    files: Array<{ name: string; download_url: string }>
  }>
}

const HEADERS = ['Type', 'Date', 'Due date', 'Ref', 'Documents', 'Paid', 'Total (excl. tax)', 'Total (incl. tax)', 'VAT', 'Third party', 'Code', 'Country', 'VAT ID', 'Currency']
// The hrefs are keys for the app's route resolver (invoices only), never opened; the attached files are downloads.
const refHref = (item: string, id: number) => (item === 'Invoice' ? `/compta/facture/card.php?facid=${id}` : /supplier/i.test(item) ? `/fourn/facture/card.php?facid=${id}` : null)

export const choicesFrom = (checked: Set<string> | null): AccountingFileChoice[] => KINDS.map((k) => ({ name: k.name, label: k.label, checked: checked ? checked.has(k.name) : true }))

export function mapAccountingFiles(d: FapiAccountingFiles): AccountingFilesPage {
  const rows: AccountingFileRow[] = d.documents.map((x) => ({
    type: x.item,
    date: usDate(x.date),
    dateDue: usDate(x.date_due),
    ref: { text: x.ref, href: refHref(x.item, x.id) },
    documents: x.files.map((f) => ({ text: f.name, href: f.download_url })),
    paid: x.paid ? 'Yes' : 'No',
    totalHt: formatMoney(x.amount_ht),
    totalTtc: formatMoney(x.amount_ttc),
    totalVat: formatMoney(x.amount_vat),
    thirdParty: x.thirdparty_name,
    code: x.thirdparty_code,
    country: x.country_code,
    vatId: x.vatnum,
    currency: x.currency,
  }))
  const sum = (k: 'amount_ht' | 'amount_ttc' | 'amount_vat') => formatMoney(d.documents.reduce((t, x) => t + x[k], 0))
  return {
    environment: '',
    choices: choicesFrom(new Set(Object.entries(d.filters).filter(([, on]) => on).map(([k]) => k))),
    searched: true,
    period: `${usDate(d.period.date_start)} - ${usDate(d.period.date_end)}`,
    headers: HEADERS,
    rows,
    totals: rows.length ? [{ label: 'Total', ht: sum('amount_ht'), ttc: sum('amount_ttc'), vat: sum('amount_vat') }] : [],
    downloadFields: {},
  }
}

const params = (s: { dateStart: string; dateEnd: string; kinds: string[] }) => ({
  date_start: s.dateStart,
  date_end: s.dateEnd,
  ...Object.fromEntries(KINDS.map((k) => [k.name, s.kinds.includes(k.name) ? 1 : 0])),
})

export const loadAccountingFiles = async (s: { dateStart: string; dateEnd: string; kinds: string[] }) => mapAccountingFiles(await fapiGet<FapiAccountingFiles>('/accountancy/fapi/accounting_files.php', params(s)))

// The period's documents as a zip (the files under <type>/<name> plus transactions.csv). A refusal (no zip support, nothing to zip) answers JSON.
export async function downloadAccountingZip(s: { dateStart: string; dateEnd: string; kinds: string[] }): Promise<string> {
  const res = await fapi.get<Blob>('/accountancy/fapi/accounting_files.php', { params: { ...params(s), action: 'zip' }, responseType: 'blob' })
  if (/json|html/i.test(String(res.headers['content-type'] ?? ''))) {
    let message = 'The backend did not return a ZIP file.'
    try {
      message = (JSON.parse(await res.data.text()) as { message?: string }).message || message
    } catch {
      /* keep the generic text */
    }
    throw new Error(message)
  }
  const name = decodeURIComponent(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? `${s.dateStart}-${s.dateEnd}_export.zip`)
  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return name
}
