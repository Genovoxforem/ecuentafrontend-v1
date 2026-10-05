import { describe, expect, it } from 'vitest'
import { ALL_APPS, filterAllApps } from './allApps'

describe('ALL_APPS', () => {
  it('only ever points at React routes, never at a backend page', () => {
    for (const section of ALL_APPS) {
      for (const tile of section.tiles) {
        if (!tile.to) continue
        expect(tile.to.startsWith('/'), `${section.title} > ${tile.label}`).toBe(true)
        expect(tile.to, `${section.title} > ${tile.label}`).not.toMatch(/\.php\b/)
        expect(tile.to, `${section.title} > ${tile.label}`).not.toContain(':')
      }
    }
  })

  it('has unique headings and unique tile labels within a heading (they are the React keys)', () => {
    const titles = ALL_APPS.map((s) => s.title)
    expect(new Set(titles).size).toBe(titles.length)
    for (const section of ALL_APPS) {
      const labels = section.tiles.map((t) => t.label)
      expect(new Set(labels).size, section.title).toBe(labels.length)
    }
  })
})

describe('filterAllApps', () => {
  it('returns everything for an empty or blank query', () => {
    expect(filterAllApps(ALL_APPS, '')).toBe(ALL_APPS)
    expect(filterAllApps(ALL_APPS, '   ')).toBe(ALL_APPS)
  })

  it('keeps only the tiles whose label contains the text, case-insensitively', () => {
    const result = filterAllApps(ALL_APPS, 'STRIPE')
    expect(result.map((s) => s.title)).toEqual(['Stripe'])
    const invoice = filterAllApps(ALL_APPS, 'detailed invoice')
    expect(invoice).toHaveLength(1)
    expect(invoice[0].tiles.map((t) => t.label)).toEqual(['Create Detailed Invoice'])
  })

  it('keeps every tile of a heading whose own title matches', () => {
    const payroll = filterAllApps(ALL_APPS, 'payroll').find((s) => s.title === 'Payroll')
    expect(payroll?.tiles.length).toBe(ALL_APPS.find((s) => s.title === 'Payroll')?.tiles.length)
  })

  it('drops headings with nothing matching', () => {
    expect(filterAllApps(ALL_APPS, 'zzzz-no-such-app')).toEqual([])
  })
})
