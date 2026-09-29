import { describe, expect, it } from 'vitest'
import { parseAccountingJournal } from './accountingJournalParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live Finance journal (172.16.5.10): the Filter card, the setup warning in this
// backend's `alert-warning` box, and the table with its extra Payment Type column.
const PAGE = `<span class="titlewithicon">Finanace Journal Area</span>
<form autocomplete="off" method="POST" action="/accountancy/journal/bankjournal.php?id_journal=3"><input type="hidden" name="token" value="tokJ"><input type="hidden" name="action" value="">
<div class="card-body"><div class="row g-2"><div class="col-md-4"><label class="form-label">Name</label><div class="form-control-plaintext">Finance journal | BQ - <span class="opacitymedium">Finance journal</span></div></div>
<div class="col-md-4"><label class="form-label">Report period</label><input id="date_start" name="date_start" type="text" value="08/01/2026"><input id="date_end" name="date_end" type="text" value="08/31/2026"></div>
<div class="col-md-4"><label class="form-label">Status of journalization</label><select name="in_bookkeeping"><option value="-1">All</option><option value="0" selected>Not yet transferred in accouting journals and ledger</option><option value="1">Already transferred</option></select></div>
<div class="col-md-4"><label class="form-label">Description</label><div class="form-control-plaintext">This is a view of record that are bound to an accounting account and can be recorded into the Journals and Ledger.<br>- Down payment invoices are included<br></div></div></div></div></form>
<div class="alert alert-warning mt-3"><span class="fas fa-exclamation-triangle"></span> A mandatory step in setup has not been completed (accounting code journal not defined for all bank accounts) : STEP 9: Define accounting accounts and journal code for each bank and financial accounts. For this, use the menu entry <strong>Accounting-Setup-Bank accounts</strong>.</div>
<table class="table table-bordered" width="100%"><tr class="tbold"><td>Date</td><td>Accounting Doc. (Source object ref)</td><td>Accounting account</td><td>Subledger account</td><td>Label operation</td><td>Payment Type</td><td class="custumRight">Debit</td><td class="custumRight">Credit</td></tr>
<tr class="oddeven"><td>08/01/2026</td><td>BankId 359 - Invoice EPOS-26-0011</td><td>1095</td><td></td><td>Customer payment <a href="/compta/paiement/card.php?id=88"><span class="fa fa-credit-card"></span></a> - Bank PettyCash - <a href="/societe/card.php?socid=5"><div class="avatar-circle">CU</div>customer1</a></td><td>Cash</td><td class="right">100.00</td><td class="right"></td></tr>
<tr class="oddeven"><td>08/18/2026</td><td>BankId 365 - Vendor</td><td>1071</td><td></td><td>Vendor Advance Payment</td><td>Cash</td><td class="right"></td><td class="right">10,000.5000</td></tr></table>`

describe('parseAccountingJournal', () => {
  it('reads the filter card, with the description lines kept apart', () => {
    const page = parseAccountingJournal(parse(PAGE))
    expect(page).toMatchObject({ token: 'tokJ', dateStart: '08/01/2026', dateEnd: '08/31/2026', inBookkeeping: '0', name: 'Finance journal | BQ - Finance journal' })
    expect(page.inBookkeepingOptions.map((o) => o.value)).toEqual(['-1', '0', '1'])
    expect(page.description).toBe('This is a view of record that are bound to an accounting account and can be recorded into the Journals and Ledger.\n- Down payment invoices are included')
  })

  it('reads the setup warning of this backend and the menu entry it names', () => {
    const { warnings } = parseAccountingJournal(parse(PAGE))
    expect(warnings).toHaveLength(1)
    expect(warnings[0].text).toMatch(/^A mandatory step in setup has not been completed/)
    expect(warnings[0].link).toBe('Accounting-Setup-Bank accounts')
  })

  it('reads the rows with their amounts as printed and the party split from the label', () => {
    const page = parseAccountingJournal(parse(PAGE))
    expect(page.hasPaymentType).toBe(true)
    expect(page.docHeader).toBe('Accounting Doc. (Source object ref)')
    expect(page.rows).toHaveLength(2)
    expect(page.rows[0]).toMatchObject({ date: '08/01/2026', doc: 'BankId 359 - Invoice EPOS-26-0011', account: '1095', subledger: '', paymentType: 'Cash', debit: 100, debitText: '100.00', creditText: '', partyName: 'customer1', partyId: '5' })
    expect(page.rows[0].label).toBe('Customer payment - Bank PettyCash -')
    expect(page.rows[1]).toMatchObject({ credit: 10000.5, creditText: '10,000.5000', debitText: '' })
  })
})
