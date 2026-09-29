import { describe, expect, it } from 'vitest'
import { parseFinancialClosure } from './financialClosure.queries'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Shaped like the real financialvalidate.php: a month header row, a values row with a checkbox per
// month, one pending-items dialog per month, the form fields and the action buttons.
const MODAL = (n: number, counts: [number, number, number, number, number, number, number]) =>
  `<div class="modal fade" id="staticBackdrop_${n}"><div class="modal-body"><h5>Binding (Pending)</h5>` +
  `<p>Customer Invoice Binding (${counts[0]})<a href="../../accountancy/customer/index.php">Click To bind</a></p>` +
  `<p>Vendor Invoice Binding (${counts[1]})<a href="x">Click To bind</a></p><p>Expence Report Binding (${counts[2]})<a href="x">Click To bind</a></p><hr>` +
  `<h5>Journal (Pending)</h5><p>Sales Journal(${counts[3]})<a href="x">Click To Journal</a></p><p>Purchase Journal (${counts[4]})<a href="x">Click To Journal</a></p>` +
  `<p>Expence Journal (${counts[5]})<a href="x">Click To Journal</a></p><p>Finance Journal (${counts[6]})<a href="x">Click To Journal</a></p></div></div>`

const PAGE = (opts: { updateid: string; checked: boolean; buttons: string; badges: string; note: string }) =>
  '<form method="POST"><input type="hidden" name="token" value="tokF"><input type="hidden" name="updateid" value="' + opts.updateid + '">' +
  '<table><tr><td>Jan-2026</td><td>Feb-2026</td><td><b>Total</b></td></tr>' +
  '<tr><td class="nowrap">0<a data-bs-target="#staticBackdrop_1">(<span style="color:red">0</span>)</a><br><input type="checkbox" name="toselect[]" value="1"' + (opts.checked ? ' checked=""' : '') + '><input type="hidden" name="monthyear[]" value="2026"></td>' +
  '<td class="nowrap">136<a data-bs-target="#staticBackdrop_2">(<span style="color:red">4</span>)</a><br><input type="checkbox" name="toselect[]" value="2"><input type="hidden" name="monthyear[]" value="2026"></td><td><b>136</b></td></tr></table>' +
  MODAL(1, [0, 0, 0, 0, 0, 0, 0]) + MODAL(2, [0, 6, 0, 0, 0, 0, 4]) +
  '<input name="date_debut" value="01/31/2026"><select name="fk_user_author"><option value="1" selected="">Arthy</option></select><select name="fk_user_validator"><option value="-1">Select</option><option value="2" selected="">Bob</option></select>' +
  `<textarea name="note_public">${opts.note}</textarea><table>${opts.badges}</table>${opts.buttons}</form>`

describe('parseFinancialClosure', () => {
  it('reads a year with no closing yet: the Create action, nothing pre-ticked, each month\'s pending items', () => {
    const form = parseFinancialClosure(parse(PAGE({ updateid: '', checked: false, buttons: '<button name="action" value="validate" type="submit">Create Year Ending</button>', badges: '', note: '' })), '2026')
    expect(form.existing).toBeNull()
    expect(form.actions).toEqual([{ action: 'validate', label: 'Create Year Ending' }])
    expect(form.months.map((m) => [m.value, m.label, m.movements, m.unvalidated, m.checked])).toEqual([
      ['1', 'Jan-2026', '0', '0', false],
      ['2', 'Feb-2026', '136', '4', false],
    ])
    expect(form.months[1].pending).toEqual([
      {
        title: 'Binding (Pending)',
        items: [
          { label: 'Customer Invoice Binding', count: 0 },
          { label: 'Vendor Invoice Binding', count: 6 },
          { label: 'Expence Report Binding', count: 0 },
        ],
      },
      {
        title: 'Journal (Pending)',
        items: [
          { label: 'Sales Journal', count: 0 },
          { label: 'Purchase Journal', count: 0 },
          { label: 'Expence Journal', count: 0 },
          { label: 'Finance Journal', count: 4 },
        ],
      },
    ])
    expect(form.startDate).toBe('01/31/2026')
    expect(form.author).toBe('1')
    expect(form.validator).toBe('2')
  })

  it('reads a year that already has a closing: its id, statuses, ticked months, note and the Update / Approve actions', () => {
    const badges =
      '<tr><td>Status</td><td><span class="badge badge-status1 badge-status" data-geo="Pending Approval">Pending Approval</span></td></tr>' +
      '<tr><td>Work Status</td><td><span class="badge badge-status0 badge-status" data-geo="Started">Started</span></td></tr>'
    const buttons = '<button name="action" value="update" type="submit">Update Year Ending</button><button name="action" value="approve" type="submit">Approve</button>'
    const form = parseFinancialClosure(parse(PAGE({ updateid: '1', checked: true, buttons, badges, note: 'Year end note' })), '2025')
    expect(form.existing).toEqual({ id: '1', approval: 'Pending Approval', workStatus: 'Started' })
    expect(form.actions.map((a) => [a.action, a.label])).toEqual([
      ['update', 'Update Year Ending'],
      ['approve', 'Approve'],
    ])
    expect(form.months[0].checked).toBe(true)
    expect(form.months[1].checked).toBe(false)
    expect(form.note).toBe('Year end note')
    expect(form.hidden.updateid).toBe('1')
    expect(form.monthYears).toEqual(['2026', '2026'])
  })
})
