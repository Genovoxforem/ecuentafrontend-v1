import { describe, expect, it } from 'vitest'
import { slugify, underConstructionPath } from './underConstruction'

describe('underConstructionPath', () => {
  it('builds a path-only link from the section key and the item title', () => {
    expect(underConstructionPath('payroll_v2', 'Employee Award')).toBe('/under-construction/payroll-v2/employee-award')
  })

  it('never produces an empty segment', () => {
    expect(slugify('???')).toBe('page')
    expect(slugify('  Résumé & CV (new) ')).toBe('r-sum-cv-new')
  })
})
