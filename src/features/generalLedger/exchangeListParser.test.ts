import { describe, expect, it } from 'vitest'
import { readExchangeList } from './exchangeListParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live page (172.16.5.10): the label/input filter row, the malformed `</a>` in the
// headers, a plain line and a line with a loss, the total row and the "For the period of" caption.
const PAGE = `<select id="limit" name="limit"><option name="25">25</option><option name="250" selected="selected">250</option></select><a class="paginationnext" href="?page=1"></a><input type="hidden" name="pageplusoneold" value="1">
<form id="searchFormList"><div class="print_value"><div class="sub_head">For the period of 2026-01-01 &nbsp; To &nbsp; 2026-12-31</div></div>
<table class="newCustomUItable centpercentRemoved ledger-table bd_border" id="excelPrint"><tr class="hideonexport"><td>Currency Code : </td><td><input type="text" name="search_currency_code" value="USD"></td><td>Select Date</td><td><input type="text" name="newdatepicker" value="01/01/2026-12/31/2026" id="config-demo"></td>
<td>Chart of Account</td><td><select name="search_accountancy_code_end"><option value="-1">&nbsp;</option><option value="1087" selected="selected">1087 - Accounts receivable</option><option value="2042">2042 - Accounts payable</option></select></td>
<td>Exchage Revaluation Date</td><td><input id="exchange_date" name="exchange_date" type="text" value="09/28/2026"><input type="hidden" name="exchange_dateday" value="28"><input type="hidden" name="exchange_datemonth" value="09"><input type="hidden" name="exchange_dateyear" value="2026"></td><td><button type="submit"></button></td></tr>
<tr><th title="Num-journal">Num-journal</a></th><th class="center" title="Date">Date</a></th><th>Accounting Doc.</a></th><th>Account</a></th><th>Currency</a></th><th>Exchange Rate</a></th><th class="right">Debit (ZMW)</a></th><th class="right">Credit (ZMW)</a></th><th>New accounting currency amount</th>
<th>Unrealized gain/loss</th></tr>
<tr class="oddeven"><td><a href="/accountancy/bookkeeping/card.php?piece_num=7&save_lastsearch_values=1"><span class="far fa-file"></span>7</a>-BQ</td><td>04/01/2026</td><td class="">BankId 104 - Invoice</td>
<td>1095 -Petty cash account</td><td>ZMW</td><td>1.0000</td><td class="nowrap right">2,500.00<br><span id="debit_currate" style="font-size:0.9em">Conversion Amt : 2,500.00</span></td><td class="nowrap right"></td><td class="nowrap right">2,500.00<br><span id="debit_currate">Exchange rate at revaluation : 1.00</span></td><td class="nowrap right">0.00<i class="fa fa-arrow-down ps-1 text-warning"></i></td></tr>
<tr class="oddeven"><td><a href="/accountancy/bookkeeping/card.php?piece_num=12&save_lastsearch_values=1">12</a>-ER</td><td>04/02/2026</td><td>ER-1</td>
<td>2042 -Accounts payable</td><td>USD</td><td>25.0000</td><td class="nowrap right"></td><td class="nowrap right">100.00<br><span>Conversion Amt : 2,500.00</span></td><td class="nowrap right">2,300.00<br><span>Exchange rate at revaluation : 23.00</span></td><td class="nowrap right">-200.00<i class="fa fa-arrow-down ps-1 text-danger"></i></td></tr>
<tfoot><tr class="liste_total"><td><span>Total</span></td><td></td><td></td><td></td><td></td><td></td><td class="right">1,001,169.2196</td><td class="right">1,001,233.2222</td><td></td><td></td></tr></tfoot></table></form>`

describe('readExchangeList', () => {
  it('reads each line with its converted amounts, revaluation rate and gain/loss trend', () => {
    const list = readExchangeList(parse(PAGE))
    expect(list.headers[0]).toBe('Num-journal')
    expect(list.headers[9]).toBe('Unrealized gain/loss')
    expect(list.rows).toHaveLength(2)
    expect(list.rows[0]).toEqual({
      pieceNum: '7',
      journal: 'BQ',
      date: '04/01/2026',
      docRef: 'BankId 104 - Invoice',
      account: '1095 -Petty cash account',
      currency: 'ZMW',
      rate: '1.0000',
      debit: '2,500.00',
      debitConverted: '2,500.00',
      credit: '',
      creditConverted: '',
      newAmount: '2,500.00',
      revaluationRate: '1.00',
      gainLoss: '0.00',
      trend: 'none',
    })
    expect(list.rows[1]).toMatchObject({ pieceNum: '12', journal: 'ER', credit: '100.00', creditConverted: '2,500.00', newAmount: '2,300.00', revaluationRate: '23.00', gainLoss: '-200.00', trend: 'down' })
    expect(list.totals).toEqual({ debit: '1,001,169.2196', credit: '1,001,233.2222' })
  })

  it('reads the filters, the account choices and the pager', () => {
    const list = readExchangeList(parse(PAGE))
    expect(list.filters).toEqual({ currency: 'USD', dateStart: '2026-01-01', dateEnd: '2026-12-31', account: '1087', exchangeDate: '2026-09-28' })
    expect(list.accountOptions).toEqual([
      { value: '1087', label: '1087 - Accounts receivable' },
      { value: '2042', label: '2042 - Accounts payable' },
    ])
    expect(list).toMatchObject({ limit: 250, limitOptions: [25, 250], page: 0, hasNext: true, hasPrev: false, period: 'For the period of 2026-01-01 To 2026-12-31' })
  })

  it('reads a period typed with spaces around the dash', () => {
    const list = readExchangeList(parse(PAGE.replace('01/01/2026-12/31/2026', '09/01/2026 - 09/30/2026')))
    expect(list.filters).toMatchObject({ dateStart: '2026-09-01', dateEnd: '2026-09-30' })
  })

  it('refuses a page that is not the report', () => {
    expect(() => readExchangeList(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
