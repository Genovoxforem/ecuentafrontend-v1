// Small text helpers shared by the screens and parsers.

/** Removes the HTML tags from a string and trims it. */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * The text of an HTML string. The markup is parsed into an inert document (scripts never run and images are not loaded), unlike
 * `element.innerHTML = html`, where a tag such as <img onerror=...> runs its handler while it is parsed even on a detached element.
 * Use it for every piece of HTML that comes from the backend (notes, e-mail defaults, table cells).
 */
export function htmlToText(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
}

/** "1,234.50 ZMW" to 1234.5 (0 when there is no number). */
export function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Removes the PHP warnings a development backend prints into a page ("( ! ) Warning: …" as `<br /><font size='1'><table
 * class='xdebug-error …'>…</table></font>`). A `<table>` inside a table row makes the HTML parser close the surrounding
 * table, so they have to go before the page is parsed.
 */
export function stripPhpWarnings(html: string): string {
  return html.replace(/(?:<br\s*\/?>\s*)?<font size='1'><table class='xdebug-error[\s\S]*?<\/table><\/font>/g, '')
}
