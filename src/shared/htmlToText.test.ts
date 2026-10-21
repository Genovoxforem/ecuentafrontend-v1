import { describe, expect, it } from 'vitest'
import { htmlToText } from './htmlToText'

describe('htmlToText', () => {
  it('returns an empty string for missing notes', () => {
    expect(htmlToText(null)).toBe('')
    expect(htmlToText(undefined)).toBe('')
    expect(htmlToText('')).toBe('')
  })

  it('keeps plain-text notes as they are, newlines included', () => {
    expect(htmlToText('Deliver before noon\nCall on arrival ')).toBe('Deliver before noon\nCall on arrival')
  })

  it('turns rich-text line breaks into newlines and drops other tags', () => {
    expect(htmlToText('<p>First <b>line</b></p><p>Second line<br>Third line</p>')).toBe('First line\nSecond line\nThird line')
  })

  it('decodes entities', () => {
    expect(htmlToText('Smith &amp; Sons &lt;VIP&gt;')).toBe('Smith & Sons <VIP>')
  })
})
