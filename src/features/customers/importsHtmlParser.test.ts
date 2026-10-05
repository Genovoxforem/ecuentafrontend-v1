import { describe, expect, it } from 'vitest'
import { looksLikeLegacyLoginPage, parseImportDatasets } from './importsHtmlParser'

// Markup copied from a real GET /imports/import.php response (Step 1).
const STEP1 = `
<div class="menu"><a href="/imports/import.php?step=2&datatoimport=societe_1&idmenu=1650059">Import Customers/Vendors</a></div>
<div class="container-fluid mt-3"><div class="alert alert-info d-block">Choose dataset you want to import...</div>
<table class="ec-table-hover-effect table table-bordered"><tr class="liste_titre"><td>Module/Application</td><td>Importable dataset</td><td>&nbsp;</td></tr>
<tr class="oddeven"><td class="tdoverflowmax200" title="Users &amp; Groups">Users &amp; Groups</td><td><div class="twolinesmax-normallineheight minwidth200onall"><span class="me-1 fas fa-user"></span>Users (employees or not) and properties</div></td><td style="text-align: right"><a href="/imports/import.php?step=2&datatoimport=user_1&excludefirstline=2&enclosure=%22"><span class="me-1 fas fa-arrow-alt-circle-right"></span></a></td></tr>
<tr class="oddeven"><td class="tdoverflowmax200" title="Third Parties">Third Parties</td><td><div class="twolinesmax-normallineheight minwidth200onall"><span class="me-1 fas fa-user-tie"></span>Third-parties and their properties</div></td><td style="text-align: right"><a href="/imports/import.php?step=2&datatoimport=societe_1&excludefirstline=2&enclosure=%22"><span class="me-1 fas fa-arrow-alt-circle-right"></span></a></td></tr>
<tr class="oddeven"><td>Broken row without a link</td><td>Nothing to open</td><td></td></tr>
</table></div>`

describe('parseImportDatasets', () => {
  it('reads each dataset row with its module, label and datatoimport code', () => {
    const doc = new DOMParser().parseFromString(STEP1, 'text/html')
    expect(parseImportDatasets(doc)).toEqual([
      { module: 'Users & Groups', label: 'Users (employees or not) and properties', code: 'user_1' },
      { module: 'Third Parties', label: 'Third-parties and their properties', code: 'societe_1' },
    ])
    expect(looksLikeLegacyLoginPage(doc)).toBe(false)
  })

  it('recognises the login page when no dataset row is there', () => {
    const doc = new DOMParser().parseFromString('<form><input name="password" type="password"></form>', 'text/html')
    expect(parseImportDatasets(doc)).toEqual([])
    expect(looksLikeLegacyLoginPage(doc)).toBe(true)
  })
})
