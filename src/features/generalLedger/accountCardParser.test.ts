import { describe, expect, it } from 'vitest'
import { readAccountCard } from './accountCardParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live page (172.16.5.10, account 1012): note the unclosed `<tr>` after
// "Personalized groups".
const PAGE = (buttons: string) => `<div class="arearef"><div class="subTitle">Enabled <img src="/theme/thevox/img/statut4.png" alt="" title="Enabled"></div></div>
<div class="tabs"><a id="card" class="tabactive tab" href="/accountancy/admin/card.php?id=110100203">Accounting account</a></div>
<div class="fichecenter"><div class="underbanner clearboth"></div><table class="newCustomUItable"><tr><td class="titlefield">Label</td><td colspan="2">Plant</td></tr><tr><td class="titlefield">Short label</td><td colspan="2"></td></tr><tr><td>Parent account</td><td colspan="2">101 - Fixed assets</td></tr><tr><td>Personalized groups</td><td colspan='2'></td><tr><td>Group of account</td><td colspan="2">ASSETS</td></tr></table></div>
<div class="tabsAction">${buttons}</div>`

const ALLOWED = '<a class="butAction" href="/accountancy/admin/card.php?action=update&token=tok&id=110100203">Modify</a><a class="butActionDelete" href="/accountancy/admin/card.php?action=delete&token=tok&id=110100203">Delete</a>'
const REFUSED = '<a class="butActionRefused classfortooltip" href="#" title="Not allowed">Modify</a><a class="butActionRefused classfortooltip" href="#" title="Not allowed">Delete</a>'

describe('readAccountCard', () => {
  it('reads the status, the rows and the buttons', () => {
    expect(readAccountCard(parse(PAGE(ALLOWED)))).toEqual({
      status: 'Enabled',
      rows: [
        { label: 'Label', value: 'Plant' },
        { label: 'Short label', value: '' },
        { label: 'Parent account', value: '101 - Fixed assets' },
        { label: 'Personalized groups', value: '' },
        { label: 'Group of account', value: 'ASSETS' },
      ],
      canModify: true,
      deleteHref: '/accountancy/admin/card.php?action=delete&token=tok&id=110100203',
    })
  })

  it('offers neither action to a user without the right', () => {
    expect(readAccountCard(parse(PAGE(REFUSED)))).toMatchObject({ canModify: false, deleteHref: null })
  })

  it('refuses a page with no account', () => {
    expect(() => readAccountCard(parse('<div>Access denied</div>'))).toThrow(/not found/)
  })
})
