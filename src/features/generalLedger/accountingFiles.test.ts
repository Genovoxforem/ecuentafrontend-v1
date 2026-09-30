import { describe, expect, it } from 'vitest'
import { accountingFilesParams, findZipStart } from './accountingFiles.queries'

describe('findZipStart', () => {
  it('finds an archive that follows PHP warnings printed as HTML', () => {
    const html = new TextEncoder().encode("<br /><font size='1'>( ! ) Warning</font>")
    const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])
    const body = new Uint8Array(html.length + zip.length)
    body.set(html)
    body.set(zip, html.length)
    expect(findZipStart(body)).toBe(html.length)
  })

  it('reports -1 for a page that holds no archive', () => {
    expect(findZipStart(new TextEncoder().encode('<html>Error: nothing found PK</html>'))).toBe(-1)
    expect(findZipStart(new Uint8Array())).toBe(-1)
  })
})

describe('accountingFilesParams', () => {
  it('sends the period as day / month / year and each ticked kind', () => {
    const params = accountingFilesParams({ dateStart: '2026-01-05', dateEnd: '2026-12-31', kinds: ['selectinvoices', 'selectdonations'] })
    expect(Object.fromEntries(params)).toEqual({
      action: 'searchfiles',
      date_startday: '5',
      date_startmonth: '1',
      date_startyear: '2026',
      date_stopday: '31',
      date_stopmonth: '12',
      date_stopyear: '2026',
      selectinvoices: '1',
      selectdonations: '1',
      search: 'Search',
    })
  })
})
