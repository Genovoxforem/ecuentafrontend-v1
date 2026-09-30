import { describe, expect, it } from 'vitest'
import { parseBankAccountsList } from './bankAccountsListParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const HEAD =
  '<thead><tr><th title="Bank accounts">Bank accounts</th><th title="Label">Label</th><th title="Type">Type</th><th title="Number">Number</th><th title="Accounting account">Accounting account</th>' +
  '<th title="Accounting code journal">Accounting code journal</th><th class="center" title="Entries to reconcile">Entries to reconcile</th><th class="center" title="Status">Status</th><th class="right" title="Balance">Balance</th></tr></thead>'

// Rows follow the real markup: the ref cell links to card.php, the reconcile cell to the reconcile
// list (or is plain text), the status is a badge and the balance links to the account's entries.
const ROW = (id: number, ref: string, label: string, type: string, account: string, reconcile: string, status: string, balance: string) =>
  `<tr><td class="nowrap"><a href="/compta/bank/card.php?id=${id}&amp;save_lastsearch_values=1"><span></span>${ref}</a></td><td>${label}</td><td>${type}</td><td></td><td>${account}</td><td>BQ - Finance journal</td>` +
  `<td>${reconcile}</td><td><span class="badge badge-status4 badge-status" title="${status}">${status}</span></td><td class="right"><a href="/compta/bank/bankentries_list.php?id=${id}">${balance}</a></td></tr>`

const COUNT = (id: number, n: number, late = 0) =>
  `<a href="/compta/bank/bankentries_list.php?action=reconcile&amp;id=${id}&amp;search_account=${id}&amp;search_conciliated=0"><span class="badge badge-status1 badge-status" title="Entries to reconcile">${n}</span></a>` +
  (late ? `<span class="badge badge-danger"><i></i> ${late}</span>` : '')

describe('parseBankAccountsList', () => {
  it('reads every column of each account, including the reconcile badge and the status', () => {
    const rows = parseBankAccountsList(
      parse(
        `<table id="example">${HEAD}<tbody>` +
          ROW(1, 'CASH', 'CASH AND HAND', 'Cash account', '1090 - Cash in Hand', '<span class="opacitymedium">Cash account</span>', 'Open', '76,513.02 ZMW') +
          ROW(5, 'Current', 'Current', 'Current or credit card account', '1093 - Bank current account', COUNT(5, 3), 'Open', '-75.00 ZMW') +
          ROW(6, 'Dollar_Bank', 'Dollar Bank', 'Current or credit card account', '1093 - Bank current account', COUNT(6, 1, 2), 'Closed', '$1,000.00') +
          '</tbody></table>',
      ),
    )
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      id: '1',
      ref: 'CASH',
      label: 'CASH AND HAND',
      type: 'Cash account',
      number: '',
      accountingAccount: '1090 - Cash in Hand',
      journal: 'BQ - Finance journal',
      toReconcile: { kind: 'text', text: 'Cash account' },
      open: true,
      statusLabel: 'Open',
      balance: 76513.02,
      balanceText: '76,513.02 ZMW',
    })
    expect(rows[1]).toMatchObject({ id: '5', toReconcile: { kind: 'count', count: 3, late: 0 }, balance: -75, balanceText: '-75.00 ZMW' })
    expect(rows[2]).toMatchObject({ id: '6', toReconcile: { kind: 'count', count: 1, late: 2 }, open: false, statusLabel: 'Closed', balance: 1000, balanceText: '$1,000.00' })
  })

  it('finds columns by header title, so a re-ordered or extended header still works', () => {
    const head = '<thead><tr><th title="Balance">Balance</th><th title="Date creation">Date creation</th><th title="Bank accounts">Bank accounts</th><th title="Label">Label</th></tr></thead>'
    const rows = parseBankAccountsList(parse(`<table id="example">${head}<tbody><tr><td>5.00 ZMW</td><td>2026-01-01</td><td><a href="/compta/bank/card.php?id=9">REF</a></td><td>L</td></tr></tbody></table>`))
    expect(rows[0]).toMatchObject({ id: '9', ref: 'REF', label: 'L', balance: 5, type: '', toReconcile: { kind: 'text', text: '' } })
  })

  it('returns no rows for an empty list and refuses a page that is not the list', () => {
    expect(parseBankAccountsList(parse(`<table id="example">${HEAD}<tbody></tbody></table>`))).toEqual([])
    expect(() => parseBankAccountsList(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
