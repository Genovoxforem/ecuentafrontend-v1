import { describe, expect, it } from 'vitest'
import { SETTINGS_GROUPS } from './settingsPanel'

describe('SETTINGS_GROUPS', () => {
  it('has the classic panel\'s 19 groups with unique titles', () => {
    expect(SETTINGS_GROUPS).toHaveLength(19)
    expect(new Set(SETTINGS_GROUPS.map((g) => g.title)).size).toBe(19)
  })

  it('only ever points at React routes, never at a backend page', () => {
    for (const group of SETTINGS_GROUPS) {
      for (const link of group.links) {
        if (!link.to) continue
        expect(link.to.startsWith('/'), `${group.title} > ${link.label}`).toBe(true)
        expect(link.to, `${group.title} > ${link.label}`).not.toMatch(/\.php\b/)
        expect(link.to, `${group.title} > ${link.label}`).not.toContain(':')
      }
    }
  })

  it('has unique link labels within a group (they are the React keys)', () => {
    for (const group of SETTINGS_GROUPS) {
      const labels = group.links.map((l) => l.label)
      expect(new Set(labels).size, group.title).toBe(labels.length)
    }
  })
})
