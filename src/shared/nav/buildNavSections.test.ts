import { LayoutGrid } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import type { NavSection } from '../../features/navTypes'
import { buildAppMenuFromRows, isMenuNodeVisible, type AppMenuResponse } from './appMenu.queries'
import { buildNavSections, pruneToBackendLabels } from './buildNavSections'

const node = (titre: string, children: AppMenuResponse['sections'][string] = []) => ({ url: '', titre, level: 0, target: '', leftmenu: '', mainmenu: '', children })

const LOCAL: NavSection[] = [
  {
    key: 'zra',
    label: 'Zra',
    icon: LayoutGrid,
    items: [
      { label: 'ASYCUDA', items: [{ label: 'Import(ASYCUDA)', path: '/zra-import' }, { label: 'Create Asycuda Invoice', path: '/asycuda-purchase' }] },
      { label: 'Sales', items: [{ label: 'Invoice Details', path: '/zra-invoices' }, { label: 'Pending Sales Invoices', path: '/zra-pending' }] },
    ],
  },
  { key: 'ticket', label: 'Ticket', icon: LayoutGrid, items: [{ label: 'List', path: '/tickets' }] },
  { key: 'expenses', label: 'Expenses', icon: LayoutGrid, items: [{ label: 'New expense report', path: '/expenses/new' }] },
]

describe('buildNavSections', () => {
  it('shows a hard-coded flat section only for the items the backend lists, and adds backend items it has no page for', () => {
    const menu: AppMenuResponse = {
      topMenus: [{ key: 'zra', title: 'Zra', url: '' }],
      sections: { zra: [node('ASYCUDA'), node('Import(ASYCUDA)'), node('Sales'), node('Invoice Details'), node('Brand New Page')] },
    }
    const [zra] = buildNavSections(menu, LOCAL, LayoutGrid)
    expect(zra.items).toEqual([
      { label: 'ASYCUDA', items: [{ label: 'Import(ASYCUDA)', path: '/zra-import' }] },
      { label: 'Sales', items: [{ label: 'Invoice Details', path: '/zra-invoices' }] },
      { label: 'Brand New Page', path: '/under-construction/zra/brand-new-page' },
    ])
  })

  it('shows nothing under a module the backend lists but gives no enabled items', () => {
    const menu: AppMenuResponse = { topMenus: [{ key: 'ticket', title: 'Ticket', url: '' }], sections: { ticket: [] } }
    expect(buildNavSections(menu, LOCAL, LayoutGrid)[0].items).toEqual([])
  })

  it('keeps the fixed list for Expenses, whose menu is built in PHP and so has no rows', () => {
    const menu: AppMenuResponse = { topMenus: [{ key: 'expences', title: 'Expenses', url: '' }], sections: {} }
    expect(buildNavSections(menu, LOCAL, LayoutGrid)[0].items).toEqual([{ label: 'New expense report', path: '/expenses/new' }])
  })

  it('never invents a module the backend does not list', () => {
    const menu: AppMenuResponse = { topMenus: [{ key: 'ticket', title: 'Ticket', url: '' }], sections: { ticket: [node('List')] } }
    expect(buildNavSections(menu, LOCAL, LayoutGrid).map((s) => s.key)).toEqual(['ticket'])
  })
})

describe('menu items the local nav names differently', () => {
  it('links a backend item by its legacy URL when its label matches nothing local', () => {
    const kitchen: NavSection = { key: 'kitchen', label: 'Kitchen', icon: LayoutGrid, items: [{ label: 'Kitchen Dashboard', path: '/kitchen-dashboard' }] }
    const menu: AppMenuResponse = {
      topMenus: [{ key: 'Kitchen', title: 'Kitchen', url: '' }],
      sections: { Kitchen: [{ ...node('Home'), url: '/kitchen/dashboard.php?idmenu=1' }, { ...node('Something Else'), url: '/nowhere.php' }] },
    }
    expect(buildNavSections(menu, [kitchen], LayoutGrid)[0].items).toEqual([
      { label: 'Home', path: '/kitchen-dashboard' },
      { label: 'Something Else', path: '/under-construction/kitchen/something-else' },
    ])
  })
})

describe('pruneToBackendLabels', () => {
  it('drops a group whose children are all unlisted', () => {
    const items = [{ label: 'G', items: [{ label: 'a', path: '/a' }] }]
    expect(pruneToBackendLabels(items, new Set(['g']))).toEqual([])
  })
})

describe('menu flags and Home dashboards', () => {
  it('treats a row flagged disabled or not permitted as hidden', () => {
    expect(isMenuNodeVisible({ enabled: true, perms: true })).toBe(true)
    expect(isMenuNodeVisible({})).toBe(true)
    expect(isMenuNodeVisible({ enabled: false, perms: true })).toBe(false)
    expect(isMenuNodeVisible({ enabled: true, perms: 0 })).toBe(false)
    expect(isMenuNodeVisible({ enabled: '0' })).toBe(false)
  })

  it('lists a module dashboard under Home only for modules the backend lists', () => {
    const top = (rowid: number, mainmenu: string, titre: string) => ({ rowid, fk_menu: 0, url: '', titre, mainmenu, type: 'top' })
    const menu = buildAppMenuFromRows([top(1, 'dashboard', 'Home'), top(2, 'zra', 'Zra'), top(3, 'Ap', 'Purchases')])
    expect(menu.sections.dashboard.map((d) => d.titre)).toEqual(['Main Dashboard', 'ZRA Dashboard', 'Purchases Dashboard'])
  })
})
