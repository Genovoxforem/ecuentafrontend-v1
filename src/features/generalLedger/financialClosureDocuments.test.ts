import { describe, expect, it } from 'vitest'
import { parseClosureDocuments } from './financialClosureDocuments.queries'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// The tab of a year that has a closing, trimmed from the real markup.
const WITH_CLOSING = (rows: string, count: string, size: string) =>
  '<div id="profile"><div class="fichecenter"><table><tbody><tr><td class="titlefield">Number of attached files/documents</td><td colspan="3">' + count + '</td></tr>' +
  '<tr><td>Total size of attached files/documents</td><td colspan="3">' + size + '</td></tr></tbody></table></div>' +
  '<form id="formuserfile" name="formuserfile" action="/accountancy/closure/financialvalidate.php?id=&amp;uploadform=1" enctype="multipart/form-data" method="POST"><input type="hidden" name="token" value="tokU"><input type="file" name="userfile[]" multiple=""><input type="submit" name="sendit" value="Upload"></form>' +
  '<div class="table-list-of-attached-files"></div><table id="tablelines"><tbody><tr class="liste_titre"><th>Documents</th><th>Size</th><th>Date</th></tr>' + rows + '</tbody></table>' +
  '<div class="table-list-of-links"></div><form><table><tbody><tr class="oddeven"><td colspan="5" class="text-muted text-center">No registered links</td></tr></tbody></table></form></div>'

const FILE_ROW = (name: string, size: string, date: string) =>
  `<tr class="oddeven"><td><a class="documentdownload" href="/document.php?modulepart=facture&amp;file=yearending%2F2025%2F${name}"><span class="fa"></span>${name}</a></td><td class="right">${size}</td><td class="center">${date}</td><td></td></tr>`

describe('parseClosureDocuments', () => {
  it('reads the counts, the upload form token and the attached files with their download links', () => {
    const docs = parseClosureDocuments(parse(WITH_CLOSING(FILE_ROW('report.pdf', '12 KB', '09/26/2026 10:00') + FILE_ROW('notes.txt', '1 KB', '09/27/2026 09:30'), '2', '13 KB')))
    expect(docs).toMatchObject({ enabled: true, fileCount: '2', totalSize: '13 KB', token: 'tokU', links: [] })
    expect(docs.files).toEqual([
      { name: 'report.pdf', href: '/document.php?modulepart=facture&file=yearending%2F2025%2Freport.pdf', size: '12 KB', date: '09/26/2026 10:00' },
      { name: 'notes.txt', href: '/document.php?modulepart=facture&file=yearending%2F2025%2Fnotes.txt', size: '1 KB', date: '09/27/2026 09:30' },
    ])
  })

  it('treats the "No documents uploaded" row as no files', () => {
    const docs = parseClosureDocuments(parse(WITH_CLOSING('<tr class="oddeven"><td colspan="6"><span class="opacitymedium">No documents uploaded</span></td></tr>', '0', '0 b.')))
    expect(docs.files).toEqual([])
    expect(docs.fileCount).toBe('0')
    expect(docs.enabled).toBe(true)
  })

  it('reports the tab as disabled while the year has no closing, and refuses a foreign page', () => {
    const docs = parseClosureDocuments(parse('<div id="profile"><table class="newCustomUItable">Create Financial Year Ending to Upload Documents</table></div>'))
    expect(docs).toMatchObject({ enabled: false, files: [], token: '' })
    expect(() => parseClosureDocuments(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
