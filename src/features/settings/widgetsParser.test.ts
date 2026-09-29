import { describe, expect, it } from 'vitest'
import { parseWidgetsPage } from './widgetsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Markup copied from the real admin/boxes.php (images/tooltips trimmed), including its
// unterminated class attribute on the blank position option.
const PAGE =
  '<form action="/admin/boxes.php" method="POST"><input type="hidden" name="token" value="tok123"><input type="hidden" name="action" value="add">' +
  '<table><tr><td>Box</td><td>Note</td><td>Source</td><td>Activate on</td></tr>' +
  '<tr class="oddeven"><td><img src="/x.png" height="14px"> Last articles</td><td>&nbsp;</td><td>/core/boxes/box_last_knowledgerecord.php</td>' +
  '<td><select id="boxid83pos" name="boxid[83][pos]"> <option class="optiongrey value="-1">&nbsp;</option> <option value="0">Home</option> <option value="1">userhome</option> </select>' +
  '<input type="hidden" name="boxid[83][value]" value="83"></td></tr>' +
  '<tr class="oddeven"><td>Last modified articles</td><td>note</td><td>/core/boxes/box_last_modified_knowledgerecord.php</td>' +
  '<td><select name="boxid[84][pos]"><option value="-1"></option><option value="0">Home</option></select></td></tr></table></form>' +
  '<table><tr><td>Box</td></tr>' +
  '<tr class="oddeven"><td><img src="/y.png"> Latest Created Tickets</td><td>&nbsp;</td><td>Home</td><td>1</td><td><a href="boxes.php?action=switch&amp;switchfrom=7&amp;switchto=9">v</a></td>' +
  '<td><a href="boxes.php?rowid=7&action=delete&token=tok123">x</a></td></tr>' +
  '<tr class="oddeven"><td>Open Projects</td><td>&nbsp;</td><td>Home</td><td>2</td><td></td><td><a href="boxes.php?rowid=9&action=delete&token=tok123">x</a></td></tr></table>' +
  '<form action="/admin/boxes.php" method="POST"><input type="hidden" name="token" value="tok123"><input type="hidden" name="action" value="addconst">' +
  '<input type="text" name="MAIN_BOXES_MAXLINES" value="5"><select name="MAIN_ACTIVATE_FILECACHE"><option value="1">Yes</option><option value="0" selected>No</option></select></form>'

describe('parseWidgetsPage', () => {
  it('reads the available widgets, the positions and the token', () => {
    const p = parseWidgetsPage(parse(PAGE))
    expect(p.token).toBe('tok123')
    expect(p.positions).toEqual([
      { value: '0', label: 'Home' },
      { value: '1', label: 'userhome' },
    ])
    expect(p.available).toEqual([
      { boxId: '83', label: 'Last articles', note: '', sourceFile: '/core/boxes/box_last_knowledgerecord.php' },
      { boxId: '84', label: 'Last modified articles', note: 'note', sourceFile: '/core/boxes/box_last_modified_knowledgerecord.php' },
    ])
  })

  it('reads the activated widgets in page order with their row ids', () => {
    const p = parseWidgetsPage(parse(PAGE))
    expect(p.activated).toEqual([
      { rowId: '7', label: 'Latest Created Tickets', note: '', position: 'Home', order: 1 },
      { rowId: '9', label: 'Open Projects', note: '', position: 'Home', order: 2 },
    ])
  })

  it('reads the settings, and reports the file cache setting as absent when the page lacks it', () => {
    const p = parseWidgetsPage(parse(PAGE))
    expect(p.maxLines).toBe('5')
    expect(p.fileCache).toBe('0')
    const without = PAGE.replace(/<select name="MAIN_ACTIVATE_FILECACHE">[\s\S]*?<\/select>/, '')
    expect(parseWidgetsPage(parse(without)).fileCache).toBeNull()
  })

  it('refuses a page that is not the widgets admin page', () => {
    expect(() => parseWidgetsPage(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
