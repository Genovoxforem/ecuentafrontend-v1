// The backend's JSON APIs return a note exactly as stored, which is HTML when
// it was typed in the classic page's rich-text editor (and plain text, with
// real newlines, when it wasn't). The classic note pages render that HTML;
// the React note cards show text, so line-breaking tags become newlines and
// every other tag is dropped.
export function htmlToText(value: string | null | undefined): string {
  if (!value) return ''
  if (!/[<&]/.test(value)) return value.trim()
  const withBreaks = value.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, '\n')
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent ?? ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}
