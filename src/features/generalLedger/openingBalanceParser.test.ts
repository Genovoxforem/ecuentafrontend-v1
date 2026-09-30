import { describe, expect, it } from 'vitest'
import { readOpeningBalance } from './openingBalanceParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live page (172.16.5.10).
const PAGE = `<form autocomplete="off" id="openingvalidationForm"><input type="hidden" name="token" value="tokOB"><input type="hidden" name="action" value="validate">
Migration Date : <input type="text" name="newdatepicker" class="bigTextBox form-control datePic">
<table class="table" id="accountstable"><thead><tr><th>Accounts</th><th>Debit (ZMW)</th><th>Credit (ZMW)</th><th>Action</th></tr></thead><tbody><tr>
<td><select class="form-control select5" id="accounts_0" name="accounts[]"><option value="-1">Select Account</option><option value="1">1-ASSETS</option><option value="1103"> 1103-Other receivables</option></select></td>
<td><input type="text" name="debit[]" id="debit_0"></td><td><input type="text" name="credit[]" id="credit_0"></td><td></td></tr></tbody>
<tfoot><tr><th>Total</th><th><span class="totdebit"></span></th><th><span class="totcredit"></span></th></tr>
<tr><td>Fixed assets <div>(This account will hold the difference in credit and debit.)</div><input type="hidden" id="accounts_500" name="accounts[]" value="101"></td>
<td><input type="text" id="debit_500" readonly></td><td><input type="text" id="credit_500" readonly></td></tr></tfoot></table></form>`

describe('readOpeningBalance', () => {
  it('reads the accounts, the adjustment account with its note, the currency and the token', () => {
    const form = readOpeningBalance(parse(PAGE))
    expect(form.token).toBe('tokOB')
    expect(form.currency).toBe('ZMW')
    expect(form.accounts).toEqual([
      { value: '1', label: '1-ASSETS' },
      { value: '1103', label: '1103-Other receivables' },
    ])
    expect(form.adjustment).toEqual({ account: '101', label: 'Fixed assets', note: '(This account will hold the difference in credit and debit.)' })
  })

  it('refuses a page without the form', () => {
    expect(() => readOpeningBalance(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
