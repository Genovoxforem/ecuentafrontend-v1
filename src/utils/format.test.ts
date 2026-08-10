import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/utils/format'

describe('formatMoney', () => {
  it('formats a number to 2 decimals with thousands separators', () => {
    expect(formatMoney(1234.5)).toBe('1,234.50')
  })

  it('treats null/undefined as zero', () => {
    expect(formatMoney(null)).toBe('0.00')
    expect(formatMoney(undefined)).toBe('0.00')
  })

  it('coerces numeric strings', () => {
    expect(formatMoney('99.9')).toBe('99.90')
  })
})

describe('formatNumber', () => {
  it('groups thousands without forcing decimals', () => {
    expect(formatNumber(12345)).toBe('12,345')
  })

  it('treats null/undefined as zero', () => {
    expect(formatNumber(null)).toBe('0')
  })
})

describe('formatDate', () => {
  it('formats an ISO date to YYYY-MM-DD', () => {
    expect(formatDate('2026-08-08T10:30:00Z')).toBe('2026-08-08')
  })

  it('returns an empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })

  it('returns the original string for an unparseable value', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDateTime', () => {
  it('formats an ISO datetime to YYYY-MM-DD HH:MM', () => {
    expect(formatDateTime('2026-08-08T10:30:00')).toBe('2026-08-08 10:30')
  })

  it('returns an empty string for null/undefined', () => {
    expect(formatDateTime(null)).toBe('')
  })
})
