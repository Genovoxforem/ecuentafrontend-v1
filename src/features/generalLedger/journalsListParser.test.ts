import { describe, expect, it } from 'vitest'
import { readJournalsList } from './journalsListParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const PICKER = (checked: (k: string) => boolean) =>
  [
    ['t.piece_num', 'Num. transaction'],
    ['t.code_journal', 'Journal'],
    ['t.doc_date', 'Date'],
    ['t.doc_ref', 'Accounting Doc.'],
    ['t.numero_compte', 'Account'],
    ['t.subledger_account', 'Subledger account'],
    ['t.label_operation', 'Label'],
    ['t.debit', 'Debit'],
    ['t.credit', 'Credit'],
    ['t.date_creation', 'Creation date'],
    ['t.date_export', 'Date export'],
  ]
    .map(([k, l]) => `<li class="dropdown-item"><input type="checkbox" id="checkbox${k}" value="${k}"${checked(k) ? ' checked="checked"' : ''}/><label for="checkbox${k}">${l}</label></li>`)
    .join('')

// Trimmed from the live page (172.16.5.10): same filter row, the malformed `</a>` in the header
// cells, the nested table in the doc-ref cell, the picker in the last header cell and the pager.
const PAGE = (opts: { reexport: boolean; page?: number; next?: boolean; prev?: boolean; exported?: boolean } = { reexport: true }) => `
<form autocomplete="off" method="POST" id="searchFormList" action="/accountancy/bookkeeping/list.php"><input type="hidden" name="token" value="tok123">
<table class="ecnta-event-details"><tr><td><div class="pagination"><ul><li class="paginationcombolimit"><select id="limit" name="limit"><option name="10">10</option><option name="25">25</option><option name="250" selected="selected">250</option></select></li>
${opts.prev ? '<li class="pagination paginationpageleft"><a class="paginationprevious reposition" href="/accountancy/bookkeeping/list.php?page=0"><i class="fa fa-chevron-left"></i></a></li>' : ''}
<li class="pagination"><span class="active">${(opts.page ?? 0) + 1}</li>
${opts.next ? '<li class="pagination paginationpageright"><a class="paginationnext reposition" href="/accountancy/bookkeeping/list.php?page=1"><i class="fa fa-chevron-right"></i></a></li>' : ''}
<li class="paginationafterarrows"><a class="valignmiddle" href="/accountancy/bookkeeping/list.php?action=setreexport&token=tok123&value=${opts.reexport ? 0 : 1}"><span class="me-1 fas ${opts.reexport ? 'fa-toggle-on' : 'fa-toggle-off'}" data-geo="Activated"></span></a> <span>Include docs already exported</span><a class="btn" href="/accountancy/bookkeeping/list.php?action=export_file&amp;search_date_startyear=2026" title="Export filtered list (Export CSV Configurable)"><i class="fa fa-file-export"></i></a><a class="btn" href="./card.php?action=create" title="New transaction"></a></li></ul></div>
<input type="hidden" name="pageplusoneold" value="${(opts.page ?? 0) + 1}"></td></tr></table>
<div class="container-fluid"><div class="div-table-responsive"><table class="newCustomUItable centpercentRemoved ledger-table">
<tr class="liste_titre_filter"><td class="liste_titre"><input type="text" name="search_mvt_num" class="form-control" size="6" value="62"></td><td class="liste_titre center"><input type="text" name="search_ledger_code" value="BQ"></td>
<td class="liste_titre center"><input id="search_date_start" name="search_date_start" type="text" value="01/01/2026"><input type="hidden" name="search_date_startday" value="01"><input type="hidden" name="search_date_startmonth" value="01"><input type="hidden" name="search_date_startyear" value="2026">
<input id="search_date_end" name="search_date_end" type="text" value="12/31/2026"><input type="hidden" name="search_date_endday" value="31"><input type="hidden" name="search_date_endmonth" value="12"><input type="hidden" name="search_date_endyear" value="2026"></td>
<td class="liste_titre"><input type="text" name="search_doc_ref" value=""></td>
<td class="liste_titre"><select id="search_accountancy_code_start" name="search_accountancy_code_start"><option class="optiongrey" value="-1">&nbsp;</option><option value="1">1 - ASSETS</option><option value="1087" selected="selected">1087 - Accounts receivable</option></select><select name="search_accountancy_code_end"><option value="-1" selected>&nbsp;</option><option value="1">1 - ASSETS</option></select></td>
<td class="liste_titre"><input type="text" name="search_accountancy_aux_code_start" value=""><input type="text" name="search_accountancy_aux_code_end" value=""></td>
<td class="liste_titre"><input type="text" name="search_mvt_label" value=""/></td><td class="liste_titre"><input type="text" name="search_debit" value=""></td><td class="liste_titre"><input type="text" name="search_credit" value="&gt;100"></td>
<td class="liste_titre"><input id="date_export_start" name="date_export_start" type="text" value=""><input type="hidden" name="date_export_startday" value=""><input type="hidden" name="date_export_startmonth" value=""><input type="hidden" name="date_export_startyear" value=""></td><td class="liste_titre center"><button type="submit" name="button_search_x">s</button></td></tr>
<tr><th class="" title="Num. transaction">Num. transaction</a></th><th class="center " title="Journal">Journal</a></th><th class="center " title="Date">Date</a></th><th class="" title="Accounting Doc.">Accounting Doc.</a></th><th class="" title="Account">Account</a></th><th class="" title="Subledger account">Subledger account</a></th><th class="" title="Label">Label</a></th><th class="right " title="Debit">Debit</a></th><th class="right " title="Credit">Credit</a></th><th class="center " title="Date export">Date export</a></th><th class="center maxwidthsearch "><dl class="dropdown"><dt><input type="hidden" class="selectedfields" name="selectedfields" value=""></dt><dd><ul class="ulselectedfields">${PICKER((k) => k !== 't.date_creation')}</ul></dd></dl></th></tr>
<tr class="oddeven"><td><a href="/accountancy/bookkeeping/card.php?piece_num=7&save_lastsearch_values=1"><span class="far fa-file"></span>7</a></td><td class="text-center"><span class="gl-link-color"><a href="/accountancy/admin/journals_list.php?id=35">BQ</a></span></td><td>04/01/2026</td><td class="nowrap"><table class="newCustomUItable"><tr class="nocellnopadd"><td class="nobordernopadding nowrap">BankId 104 - Invoice</td></tr></table></td>
<td>1095</td><td></td><td>Customer payment - Bank PettyCash - customer1</td><td class="nowrap right">2,500.00</td><td class="nowrap right"></td><td>${opts.exported ? '04/30/2026 10:00' : ''}</td><td class="nowraponall center">${opts.exported ? '' : '<a class="editfielda paddingleft" href="/accountancy/bookkeeping/card.php?piece_num=7&search_date_startmonth=1&page=0"><span class="fa-pencil-alt"></span></a><a class="reposition" href="/accountancy/bookkeeping/list.php?action=delmouv&mvt_num=7&page=0"><span class="fa-trash"></span></a>'}</td></tr>
<tr class="oddeven"><td><a href="/accountancy/bookkeeping/card.php?piece_num=8&save_lastsearch_values=1">8</a></td><td class="text-center"><span class="gl-link-color"><a href="/accountancy/admin/journals_list.php?id=35">BQ</a></span></td><td>04/01/2026</td><td class="nowrap"><table><tr class="nocellnopadd"><td><a href="/compta/facture/card.php?facid=42">IN2604-0042</a><a href="/document.php?modulepart=facture&file=IN2604-0042%2FIN2604-0042.pdf"><span class="fa-file-pdf"></span></a></td></tr></table></td>
<td>1087</td><td>411CU250200001</td><td>Customer payment - customer1</td><td class="nowrap right"></td><td class="nowrap right">2,500.00</td><td></td><td class="nowraponall center"></td></tr>
<tfoot><tr class="liste_total"><td><span>Total</span><span title="Total for this page"></span></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="right">1,001,169.2196</td><td class="right">1,001,233.2222</td><td></td><td></td></tr></tfoot></table></div></div></form>`

describe('readJournalsList', () => {
  it('reads the picker, the rows (with the nested doc-ref table), the totals and the pager', () => {
    const list = readJournalsList(parse(PAGE({ reexport: true, next: true })))

    expect(list.columns.filter((c) => c.visible).map((c) => c.key)).toEqual(['t.piece_num', 't.code_journal', 't.doc_date', 't.doc_ref', 't.numero_compte', 't.subledger_account', 't.label_operation', 't.debit', 't.credit', 't.date_export'])
    expect(list.columns.find((c) => c.key === 't.date_creation')).toMatchObject({ visible: false, label: 'Creation date' })

    expect(list.rows).toHaveLength(2)
    expect(list.rows[0]).toMatchObject({ pieceNum: '7', canEdit: true, canDelete: true })
    expect(list.rows[0].cells['t.doc_ref']).toEqual({ text: 'BankId 104 - Invoice', href: null })
    expect(list.rows[0].cells['t.debit'].text).toBe('2,500.00')
    expect(list.rows[0].cells['t.credit'].text).toBe('')
    // The invoice link is kept, the attached-file link is not mistaken for it.
    expect(list.rows[1].cells['t.doc_ref']).toEqual({ text: 'IN2604-0042', href: '/compta/facture/card.php?facid=42' })
    expect(list.rows[1]).toMatchObject({ pieceNum: '8', canEdit: false, canDelete: false })

    expect(list.totals).toEqual({ 't.debit': '1,001,169.2196', 't.credit': '1,001,233.2222' })
    expect(list).toMatchObject({ limit: 250, limitOptions: [10, 25, 250], page: 0, hasNext: true, hasPrev: false, token: 'tok123', exportTitle: 'Export filtered list (Export CSV Configurable)' })
  })

  it('reads the filters the page shows, dates as ISO and a blank account choice as empty', () => {
    const { filters } = readJournalsList(parse(PAGE()))
    expect(filters).toMatchObject({
      search_mvt_num: '62',
      search_ledger_code: 'BQ',
      search_date_start: '2026-01-01',
      search_date_end: '2026-12-31',
      search_accountancy_code_start: '1087',
      search_accountancy_code_end: '',
      search_credit: '>100',
      date_export_start: '',
    })
    expect(readJournalsList(parse(PAGE())).accountOptions).toEqual([
      { value: '1', label: '1 - ASSETS' },
      { value: '1087', label: '1087 - Accounts receivable' },
    ])
  })

  it('tells the include-exported switch state and the page number apart', () => {
    expect(readJournalsList(parse(PAGE({ reexport: true }))).reexport).toBe(true)
    const off = readJournalsList(parse(PAGE({ reexport: false, page: 1, prev: true })))
    expect(off).toMatchObject({ reexport: false, page: 1, hasPrev: true, hasNext: false })
  })

  it('offers no edit or delete for an exported line', () => {
    const row = readJournalsList(parse(PAGE({ reexport: true, exported: true }))).rows[0]
    expect(row).toMatchObject({ pieceNum: '7', canEdit: false, canDelete: false })
    expect(row.cells['t.date_export'].text).toBe('04/30/2026 10:00')
  })

  it('refuses a page that is not the journals list', () => {
    expect(() => readJournalsList(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
