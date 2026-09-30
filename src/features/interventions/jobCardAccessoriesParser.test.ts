import { describe, expect, it } from 'vitest'
import { parseJobCardAccessories } from './jobCardAccessoriesParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Markup as the real fichinter/create.php prints it.
const PAGE = (items: string) =>
  '<div class="col-md-6"><label class="form-label">Accessories</label><div class="row g-1" id="accessories_container">' +
  '<div class="col-auto"><button type="button" class="btn btn-primary btn-sm" onclick="showAddGadgetForm()"><i class="fa fa-plus"></i></button></div>' +
  items +
  '</div></div>'

const item = (id: number, label: string) =>
  `<div class="col-auto"><input type="checkbox" class="btn-check" id="${id}"  name="ass_id[]" value="${id}" autocomplete="off"><label class="btn btn-outline-primary" for="${id}">${label}</label></div>`

describe('parseJobCardAccessories', () => {
  it('reads each accessory toggle with its label', () => {
    const rows = parseJobCardAccessories(parse(PAGE(item(1, 'Head Phone') + item(5, 'keyboard') + item(3, 'Pouch'))))
    expect(rows).toEqual([
      { id: 1, label: 'Head Phone' },
      { id: 5, label: 'keyboard' },
      { id: 3, label: 'Pouch' },
    ])
  })

  it('returns no accessories when the backend has none, and refuses a page without the picker', () => {
    expect(parseJobCardAccessories(parse(PAGE('')))).toEqual([])
    expect(() => parseJobCardAccessories(parse('<div>nothing</div>'))).toThrow(/not recognised/)
  })
})
