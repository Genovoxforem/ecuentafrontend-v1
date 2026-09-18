// payroll/pay_deduction.php's own list table (id="example_test") is
// server-rendered directly in the page with every real row already present
// (a plain client-side `new DataTable('#example_test')`, no ajax source) —
// confirmed live this session. Its "Payment Details" column is the label of
// whichever llx_c_type_fees-style expense category was picked on the real
// Add panel's "payment Details" <select id="expense_id_1">, whose ~115
// options are scraped from that same page load rather than hand-copied,
// since transcribing that many labels by hand risks errors a scrape avoids.
export interface PayDeductionRow {
  paymentDetails: string
  userName: string
  paymentType: string
  createdBy: string
  startDate: string
  endDate: string
  amount: string
}

export function parsePayDeductionRows(html: string): PayDeductionRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll<HTMLTableRowElement>('table#example_test > tbody > tr'))
  return rows
    .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim()))
    .filter((cells) => cells.length >= 7)
    .map((cells) => ({
      paymentDetails: cells[0],
      userName: cells[1],
      paymentType: cells[2],
      createdBy: cells[3],
      startDate: cells[4],
      endDate: cells[5],
      amount: cells[6],
    }))
}

export interface SelectOption {
  value: string
  label: string
}

export function parseExpenseCategoryOptions(html: string): SelectOption[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const select = doc.querySelector<HTMLSelectElement>('select#expense_id_1')
  if (!select) return []
  return Array.from(select.options)
    .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value !== '')
}
