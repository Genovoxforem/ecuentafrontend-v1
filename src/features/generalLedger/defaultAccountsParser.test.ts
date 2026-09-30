import { describe, expect, it } from 'vitest'
import { parseDefaultAccountsPage } from './defaultAccountsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the real response: sections are two-cell rows, fields are label + select.
const SELECT = (name: string, selected: string, extra = '') =>
  `<select name="${name}"><option value="&nbsp;">&nbsp;</option><option value="1">1 - ASSETS</option><option value="1087"${selected === '1087' ? ' selected=""' : ''}>1087 - Accounts receivable</option>` +
  `<option value="5017"${selected === '5017' ? ' selected=""' : ''}>5017 - Sales</option>${extra}</select>`

const FIELD = (name: string, label: string, selected: string, required = false, extra = '') =>
  `<tr class="oddeven value"><td class="${required ? 'fieldrequired' : ''}" width="50%"><span>${label}</span><span class="classfortooltip" title="help"></span></td><td>${SELECT(name, selected, extra)}</td></tr>`

const PAGE = (rows: string) =>
  '<div class="alert alert-info mt-3">This page can be used to set a default account.</div>' +
  '<form action="/accountancy/admin/defaultaccounts.php" method="post"><input type="hidden" name="token" value="tokA"><input type="hidden" name="action" value="update">' +
  `<table>${rows}</table><div class="center"><button name="">Modify</button></div></form>` +
  '<form action="/accountancy/admin/defaultaccounts.php" method="post"><input type="hidden" name="token" value="tokB"><input type="hidden" name="action" value="set_reference_defaults"></form>'

describe('parseDefaultAccountsPage', () => {
  it('reads the sections, labels, required flags and stored values', () => {
    const page = parseDefaultAccountsPage(
      parse(
        PAGE(
          '<tr><td>ThirdParties | Users</td><td></td></tr>' +
            FIELD('ACCOUNTING_ACCOUNT_CUSTOMER', 'Accounting account used for customer third parties', '1087', true) +
            '<tr><td>Product</td><td></td></tr>' +
            FIELD('ACCOUNTING_PRODUCT_SOLD_ACCOUNT', 'Accounting account by default for the sold products', '5017') +
            FIELD('ACCOUNTING_PRODUCT_BUY_ACCOUNT', 'Accounting account by default for the bought products', ''),
        ),
      ),
    )
    expect(page.token).toBe('tokA')
    expect(page.intro).toBe('This page can be used to set a default account.')
    expect(page.sections.map((s) => [s.title, s.fields.map((f) => f.name)])).toEqual([
      ['ThirdParties | Users', ['ACCOUNTING_ACCOUNT_CUSTOMER']],
      ['Product', ['ACCOUNTING_PRODUCT_SOLD_ACCOUNT', 'ACCOUNTING_PRODUCT_BUY_ACCOUNT']],
    ])
    expect(page.sections[0].fields[0]).toEqual({ name: 'ACCOUNTING_ACCOUNT_CUSTOMER', label: 'Accounting account used for customer third parties', required: true, value: '1087' })
    expect(page.sections[1].fields[0]).toMatchObject({ value: '5017', required: false })
    // nothing selected -> the blank first option, i.e. no account
    expect(page.sections[1].fields[1].value).toBe('')
    // the blank option is dropped from the shared list
    expect(page.options).toEqual([
      { value: '1', label: '1 - ASSETS' },
      { value: '1087', label: '1087 - Accounts receivable' },
      { value: '5017', label: '5017 - Sales' },
    ])
  })

  it('keeps a field-specific option list only when it differs from the shared one', () => {
    const page = parseDefaultAccountsPage(parse(PAGE(FIELD('A', 'A label', '') + FIELD('B', 'B label', '', false, '<option value="9999">9999 - Extra</option>'))))
    expect(page.sections[0].fields[0].options).toBeUndefined()
    expect(page.sections[0].fields[1].options?.map((o) => o.value)).toEqual(['1', '1087', '5017', '9999'])
  })

  it('refuses a page that is not the update form', () => {
    expect(() => parseDefaultAccountsPage(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
