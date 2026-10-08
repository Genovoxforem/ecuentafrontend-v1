import { beforeEach, describe, expect, it } from 'vitest'
import { collapsible, findTitleRow } from './bannerHeading'

let content: HTMLElement

function render(html: string) {
  document.body.innerHTML = `<div id="route-page-content">${html}</div>`
  content = document.getElementById('route-page-content') as HTMLElement
}

const FLEX = 'display:flex;flex-direction:row'

describe('findTitleRow', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('finds a title row and offers its button for the banner', () => {
    render(`<div><div style="${FLEX}"><h2>Vendors area</h2><button>+</button></div><div>cards</div></div>`)
    const row = findTitleRow(content)
    expect(row?.text).toBe('Vendors area')
    expect(row?.row).toBe(content.querySelector('[style]'))
    expect(row?.actions?.map((a) => a.textContent)).toEqual(['+'])
  })

  it('keeps the row when it holds something that is not a button', () => {
    render(`<div style="${FLEX}"><h2>Title</h2><input placeholder="search" /></div>`)
    expect(findTitleRow(content)?.actions).toBeNull()
    render(`<div style="${FLEX}"><h2>Title</h2><span>12 records</span></div>`)
    expect(findTitleRow(content)?.actions).toBeNull()
    render(`<div style="${FLEX}"><h2>Title</h2><button aria-haspopup="menu">Export</button></div>`)
    expect(findTitleRow(content)?.actions).toBeNull()
  })

  it('hides only the heading when there is no row', () => {
    render('<div><h2>Lonely title</h2><p>text</p></div>')
    const row = findTitleRow(content)
    expect(row?.row).toBeNull()
    expect(row?.titleBlock).toBe(content.querySelector('h2'))
  })

  it('ignores greetings, headings in tables and dialogs, and a hidden first heading', () => {
    render('<h2>Good Afternoon, vox_admin!</h2>')
    expect(findTitleRow(content)).toBeNull()
    render('<table><tr><td><h3>Cell title</h3></td></tr></table>')
    expect(findTitleRow(content)).toBeNull()
    render('<h2 style="display:none">Hidden</h2><h2>Shown</h2>')
    expect(findTitleRow(content)?.text).toBe('Shown')
  })

  it('does not offer more than three buttons', () => {
    render(`<div style="${FLEX}"><h2>T</h2><button>a</button><button>b</button><button>c</button><button>d</button></div>`)
    expect(findTitleRow(content)?.actions).toBeNull()
  })
})

describe('collapsible', () => {
  it('hides the wrapper when the element is its last visible child', () => {
    render('<section><div id="only"><h2>T</h2></div></section><p>next</p>')
    expect(collapsible(content.querySelector('#only') as HTMLElement, content)).toBe(content.querySelector('section'))
  })

  it('stops at a wrapper that still has other visible children', () => {
    render('<section><div id="a">T</div><div>more</div></section>')
    const a = content.querySelector('#a') as HTMLElement
    expect(collapsible(a, content)).toBe(a)
  })
})
