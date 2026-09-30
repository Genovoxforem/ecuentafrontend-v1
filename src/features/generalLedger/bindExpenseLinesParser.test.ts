import { describe, expect, it } from 'vitest'
import { parseBindExpenseLines } from './bindExpenseLinesParser'

const HEAD = ['Employee', 'Id line', 'Expense report', 'Date of line', 'Types of fees', 'Description', 'Amount', 'Tax Rate', 'Accounting account suggested', 'Bind line with the accounting account']

const page = (rows: string) => `<form method="POST"><input type="hidden" name="token" value="tok"><input type="hidden" name="sortfield" value="erd.date, erd.rowid"><input type="hidden" name="sortorder" value="DESC">
<select name="massaction"><option value="0">-- Select action --</option><option value="ventil">Bind</option></select>
<table><tr class="liste_titre"><th>${HEAD.join('</th><th>')}</th><th><input type="checkbox"></th></tr>${rows}</table></form>`

const row = (n: number) => `<tr class="oddeven">
<td><a href="/user/card.php?id=4">Bar worker</a></td><td>${n}</td><td><a href="/expensereport/card.php?id=12">ER2609-0012</a></td><td>09/01/2026</td><td>Transport</td><td>Taxi to site</td><td>120.00</td><td>0</td>
<td>6251 - Travel</td>
<td><select name="codeventil${n}"><option value="">-</option><option value="5" selected>6251 - Travel</option><option value="6">6252 - Meals</option></select></td>
<td><input type="checkbox" name="toselect[]" value="${n}_${n - 1}"${n === 2 ? 'checked' : ''}/></td></tr>`

describe('parseBindExpenseLines', () => {
  it('reads a line by header and keeps the checkbox value as printed', () => {
    const p = parseBindExpenseLines(new DOMParser().parseFromString(page(row(1) + row(2)), 'text/html'))
    expect(p.token).toBe('tok')
    expect(p.sortfield).toBe('erd.date, erd.rowid')
    expect(p.accounts.map((a) => a.value)).toEqual(['', '5', '6'])
    expect(p.rows).toHaveLength(2)
    expect(p.rows[1]).toMatchObject({
      lineId: '2',
      selectValue: '2_1',
      employee: 'Bar worker',
      employeeId: '4',
      reportId: '12',
      reportRef: 'ER2609-0012',
      date: '09/01/2026',
      feeType: 'Transport',
      description: 'Taxi to site',
      amount: '120.00',
      taxRate: '0',
      suggestedAccount: '6251 - Travel',
      selectedAccount: '5',
      checked: true,
    })
    // The page ticks only the lines it has a suggestion for.
    expect(p.rows[0].checked).toBe(false)
  })

  it('reads a line whose account select starts on the unclosed blank option as having no account', () => {
    // The real page prints `<option class="optiongrey  value="-1">&nbsp;</option>` (unclosed quote): no value, so the
    // browser gives the option a value of its non-breaking space.
    const blank = row(3).replace('<option value="">-</option><option value="5" selected>', '<option class="optiongrey  value="-1">&nbsp;</option><option value="5">')
    const p = parseBindExpenseLines(new DOMParser().parseFromString(page(blank), 'text/html'))
    expect(p.rows[0].selectedAccount).toBe('')
    expect(p.accounts.map((a) => a.value)).toEqual(['', '5', '6'])
  })

  it('returns no rows for the empty page', () => {
    const p = parseBindExpenseLines(new DOMParser().parseFromString(page(''), 'text/html'))
    expect(p.rows).toEqual([])
    expect(p.token).toBe('tok')
  })
})
