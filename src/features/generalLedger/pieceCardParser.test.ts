import { describe, expect, it } from 'vitest'
import { parseAmount, readPieceCard } from './pieceCardParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live page (172.16.5.10, piece 62): the header tables with their edit pencils,
// the movements form with its hidden fields, one plain line (note the stray `</td>` the page
// prints after the credit) and the add row.
const CARD = (opts: { mode?: string; extraLine?: boolean } = {}) => `
<span class="titlewithicon">Modification of a transaction</span>
<div class="tabs"><a id="transaction" class="tabactive tab" href="/accountancy/bookkeeping/card.php?piece_num=62">Transaction</a></div>
<div class="fichecenter gridAdd"><div class="fichehalfleft mt-3"><table class="table"><tr><td class="titlefield">Numero of transaction</td><td>62</td></tr>
<tr><td><table><tr><td>Date</td><td class="right"><a class="editfielda" href="/accountancy/bookkeeping/card.php?action=editdate&amp;piece_num=62&amp;mode="><span></span></a></td></tr></table></td><td colspan="3">04/27/2026</td></tr>
<tr><td><table><tr><td>Journal</td><td class="right"><a class="editfielda" href="/accountancy/bookkeeping/card.php?action=editjournal&amp;piece_num=62&amp;mode="><span></span></a></td></tr></table></td><td>BQ</td></tr>
<tr><td><table><tr><td>Accounting Doc.</td><td class="right"><a class="editfielda" href="/accountancy/bookkeeping/card.php?action=editdocref&amp;piece_num=62&amp;mode="><span></span></a></td></tr></table></td><td>BankId 128 - Invoice</td></tr></table></div>
<div class="fichehalfright"><div class="ficheaddleft"><table><tr><td class="titlefield">Type of document</td><td>bank</td></tr><tr><td class="titlefield">Creation date</td><td>05/18/2026</td></tr></table></div></div></div>
<form action="/accountancy/bookkeeping/card.php?piece_num=62" method="post"><input type="hidden" name="token" value="tok9"><input type="hidden" name="doc_date" value="1777248000">
<input type="hidden" name="doc_type" value="bank">
<input type="hidden" name="doc_ref" value="BankId 128 - Invoice">
<input type="hidden" name="code_journal" value="BQ">
<input type="hidden" name="fk_doc" value="">
<input type="hidden" name="fk_docdet" value="">
<input type="hidden" name="mode" value="${opts.mode ?? ''}">
<div class="div-table-responsive"><table class="table table-bordered alignTopAllColumns"><tr><th title="Account">Account</th><th>Subledger account</th><th>Label operation</th><th>Currency</th><th>Exchange Rate</th><th class="right">Debit (ZMW)</th><th class="right">Credit (ZMW)</th><th>Event</th></tr>
<tr class="oddeven"><td>1087 - <span class="opacitymedium">Accounts receivable</span></td><td>411CU250200001 - <span class="opacitymedium">customer1</span></td><td>Payment of invoice customer - customer1</td><td class="maxwidthonsmartphone">ZMW</td><td class="custumRight">0.00</td><td class="nowrap right debitcolor">0.00<br><span style="font-size:0.9em; font-style:italic;">(0.00)</span></td><td class="nowrap right creditcolor">1,200.50<br><span style="font-size:0.9em; font-style:italic;">(200.00)</span></td></td><td class="nowrap"><a class="editfielda reposition" href="/accountancy/bookkeeping/card.php?action=update&id=62&piece_num=62&mode=&token=tok9"><span></span></a> &nbsp;<a href="/accountancy/bookkeeping/card.php?action=confirm_delete&id=62&piece_num=62&mode=&token=tok9"><span></span></a></td></tr>
${opts.extraLine ? '<tr class="oddeven"><td>2042</td><td></td><td>Vendor</td><td>USD</td><td>25.00</td><td class="nowrap right debitcolor">80.00<br><span>(2,000.00)</span></td><td class="nowrap right creditcolor">0.00<br><span>(0.00)</span></td></td><td class="nowrap"><a class="editfielda" href="/accountancy/bookkeeping/card.php?action=update&id=63&piece_num=62&mode=&token=tok9"></a></td></tr>' : ''}
<tr class="oddeven"><!-- td columns in add mode --><td><select id="accountingaccount_number" name="accountingaccount_number"><option class="optiongrey" value="-1">&nbsp;</option><option value="1">1 - ASSETS</option><option value="1087">1087 - Accounts receivable</option></select></td><td><input type="text" name="subledger_account" value="" placeholder="Subledger account"><br><br><input type="text" name="subledger_label" value=""></td><td><input type="text" name="label_operation" value=""/></td>
<td><select name="multicurrency_code" id="multicurrency_code"><option value="INR">Indian rupees</option><option value="ZMW" selected="selected">Zambian Kwacha (ZMW)</option><option value="USD">US Dollars ($)</option></select></td><td><input type="text" name="currency_amo" id="cur_rateDT" value="1.00" /></td><td><input type="text" name="debit" value="0.00"/></td><td><input type="text" name="credit" value="0.00"/></td><td><input type="submit" class="button" name="save" value="Add"></td></tr></table></div></form>`

describe('readPieceCard', () => {
  it('reads the header, the hidden fields and the token', () => {
    const card = readPieceCard(parse(CARD()), '')
    expect(card).toMatchObject({ pieceNum: '62', mode: '', date: '04/27/2026', journal: 'BQ', accountingDoc: 'BankId 128 - Invoice', docType: 'bank', creationDate: '05/18/2026', currencyLabel: 'ZMW', token: 'tok9' })
    expect(card?.hidden).toEqual({ doc_date: '1777248000', doc_type: 'bank', doc_ref: 'BankId 128 - Invoice', code_journal: 'BQ', fk_doc: '', fk_docdet: '', mode: '' })
  })

  it('reads a line with its exchange rate and converted amounts, and its delete link', () => {
    const card = readPieceCard(parse(CARD({ extraLine: true })), '')
    expect(card?.lines).toHaveLength(2)
    expect(card?.lines[0]).toEqual({
      id: '62',
      account: '1087',
      accountLabel: 'Accounts receivable',
      subledger: '411CU250200001',
      subledgerLabel: 'customer1',
      label: 'Payment of invoice customer - customer1',
      currency: 'ZMW',
      exchangeRate: '0.00',
      debit: '0.00',
      debitConverted: '0.00',
      credit: '1,200.50',
      creditConverted: '200.00',
      deleteHref: '/accountancy/bookkeeping/card.php?action=confirm_delete&id=62&piece_num=62&mode=&token=tok9',
    })
    // A line without a label span keeps just its code; an unset subledger stays empty.
    expect(card?.lines[1]).toMatchObject({ id: '63', account: '2042', accountLabel: '', subledger: '', currency: 'USD', exchangeRate: '25.00', debit: '80.00', debitConverted: '2,000.00', deleteHref: null })
  })

  it('reads the add row: chart of accounts, currencies and the pre-selected currency', () => {
    const add = readPieceCard(parse(CARD()), '')?.add
    expect(add?.accountOptions).toEqual([
      { value: '1', label: '1 - ASSETS' },
      { value: '1087', label: '1087 - Accounts receivable' },
    ])
    expect(add?.currencyOptions.map((o) => o.value)).toEqual(['INR', 'ZMW', 'USD'])
    expect(add).toMatchObject({ currency: 'ZMW', exchangeRate: '1.00' })
  })

  it('reports the scratch mode the page carries', () => {
    expect(readPieceCard(parse(CARD({ mode: '_tmp' })), '')?.mode).toBe('_tmp')
  })

  it('returns null for a number with no transaction', () => {
    expect(readPieceCard(parse('<span class="titlewithicon">NoRecords</span>'), '')).toBeNull()
  })
})

describe('parseAmount', () => {
  it('reads thousands separators and decimals', () => {
    expect(parseAmount('1,454,068.6214')).toBeCloseTo(1454068.6214, 4)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('-4,400.00')).toBe(-4400)
  })
})
